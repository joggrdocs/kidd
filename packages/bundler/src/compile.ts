import { execFile as execFileCb } from 'node:child_process'
import { readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

import type { CompileTarget } from '@kidd/config'
import { err, ok } from '@kidd/utils/fp'
import type { AsyncResult } from '@kidd/utils/fp'

import { DEFAULT_COMPILE_TARGETS } from './constants.js'
import { detectBuildEntry, resolveConfig } from './resolve-config.js'
import type { CompileOutput, CompileParams, CompiledBinary } from './types.js'

/**
 * Packages to externalize during `bun build --compile`.
 *
 * These are optional peer dependencies of `c12` (the config loader) that bun
 * eagerly tries to resolve even though they are behind dynamic `import()` calls
 * that never execute at runtime in a compiled CLI.
 */
const COMPILE_EXTERNALS: readonly string[] = ['chokidar', 'magicast', 'giget']

/**
 * Human-readable labels for each compile target.
 */
const COMPILE_TARGET_LABELS: Readonly<Record<CompileTarget, string>> = {
  'darwin-arm64': 'macOS Apple Silicon',
  'darwin-x64': 'macOS Intel',
  'linux-arm64': 'Linux ARM64',
  'linux-x64': 'Linux x64',
  'linux-x64-musl': 'Linux x64 (musl)',
  'windows-arm64': 'Windows ARM64',
  'windows-x64': 'Windows x64',
}

/**
 * Compile a kidd CLI tool into standalone binaries using `bun build --compile`.
 *
 * Expects the bundled entry to already exist in `outDir` (i.e., `build()` must
 * be run first). For each requested target (or the current platform if none
 * specified), spawns `bun build --compile` to produce a self-contained binary.
 *
 * @param params - The compile parameters including config and working directory.
 * @returns A result tuple with compile output on success or an Error on failure.
 */
export async function compile(params: CompileParams): AsyncResult<CompileOutput> {
  const resolved = resolveConfig(params)
  const bundledEntry = detectBuildEntry(resolved.buildOutDir)

  if (!bundledEntry) {
    return err(new Error(`bundled entry not found in ${resolved.buildOutDir} — run build() first`))
  }

  const targets: readonly CompileTarget[] = resolveTargets(resolved.compile.targets)
  const isMultiTarget = targets.length > 1

  const results = await Promise.all(
    targets.map(async (target) => {
      if (params.onTargetStart) {
        await params.onTargetStart(target)
      }

      const result = await compileSingleTarget({
        bundledEntry,
        isMultiTarget,
        name: resolved.compile.name,
        outDir: resolved.compileOutDir,
        target,
      })

      if (params.onTargetComplete) {
        await params.onTargetComplete(target)
      }

      return result
    })
  )

  cleanBunBuildArtifacts(resolved.cwd)

  const failedResult = results.find((r) => r[0] !== null)
  if (failedResult) {
    const [failedError] = failedResult
    if (failedError) {
      return err(failedError)
    }
  }

  const binaries: readonly CompiledBinary[] = results
    .filter((r): r is readonly [null, CompiledBinary] => r[1] !== null)
    .map(([, binary]) => binary)

  return ok({ binaries })
}

// ---------------------------------------------------------------------------

/**
 * Compile a single target via `bun build --compile`.
 *
 * @private
 * @param params - Target compilation parameters.
 * @returns A result tuple with the compiled binary info or an error.
 */
async function compileSingleTarget(params: {
  readonly bundledEntry: string
  readonly outDir: string
  readonly name: string
  readonly target: CompileTarget
  readonly isMultiTarget: boolean
}): AsyncResult<CompiledBinary> {
  const binaryName = resolveBinaryName(params.name, params.target, params.isMultiTarget)
  const outfile = join(params.outDir, binaryName)

  const args = [
    'build',
    '--compile',
    params.bundledEntry,
    '--outfile',
    outfile,
    '--target',
    mapCompileTarget(params.target),
    ...COMPILE_EXTERNALS.flatMap((pkg) => ['--external', pkg]),
  ]

  const [execError] = await execBunBuild(args)
  if (execError) {
    return err(
      new Error(`bun build --compile failed for target ${params.target}`, { cause: execError })
    )
  }

  return ok({ label: resolveTargetLabel(params.target), path: outfile, target: params.target })
}

/**
 * Resolve the list of compile targets, falling back to the default set.
 *
 * When no targets are explicitly configured, defaults to linux-x64,
 * darwin-arm64, darwin-x64, and windows-x64 to cover ~95% of developers.
 *
 * @private
 * @param explicit - User-specified targets (may be empty).
 * @returns The targets to compile for.
 */
function resolveTargets(explicit: readonly CompileTarget[]): readonly CompileTarget[] {
  if (explicit.length > 0) {
    return explicit
  }

  return DEFAULT_COMPILE_TARGETS
}

/**
 * Build the output binary name, appending the target suffix for multi-target builds.
 *
 * @private
 * @param name - Base binary name.
 * @param target - The compile target.
 * @param isMultiTarget - Whether multiple targets are being compiled.
 * @returns The resolved binary file name.
 */
function resolveBinaryName(name: string, target: CompileTarget, isMultiTarget: boolean): string {
  if (isMultiTarget) {
    return `${name}-${target}`
  }

  return name
}

/**
 * Look up the human-readable label for a compile target.
 *
 * @param target - The compile target identifier.
 * @returns A descriptive label (e.g., "macOS Apple Silicon").
 */
export function resolveTargetLabel(target: CompileTarget): string {
  return COMPILE_TARGET_LABELS[target]
}

/**
 * Map a `CompileTarget` to Bun's `--target` string.
 *
 * Note: `linux-x64-musl` maps to `bun-linux-x64` because Bun's Linux
 * builds natively handle musl — there is no separate musl target.
 *
 * @private
 * @param target - The kidd compile target.
 * @returns The Bun target string (e.g., `'bun-darwin-arm64'`).
 */
function mapCompileTarget(target: CompileTarget): string {
  if (target === 'linux-x64-musl') {
    return 'bun-linux-x64'
  }

  return `bun-${target}`
}

/**
 * Promisified wrapper around `execFile` to invoke `bun build`.
 *
 * @private
 * @param args - Arguments to pass to `bun`.
 * @returns A result tuple with stdout on success or an Error on failure.
 */
function execBunBuild(args: readonly string[]): AsyncResult<string> {
  return new Promise((resolve) => {
    execFileCb('bun', [...args], (error, stdout) => {
      if (error) {
        resolve(err(error))
        return
      }

      resolve(ok(stdout))
    })
  })
}

/**
 * Remove temporary `.bun-build` files that `bun build --compile` leaves behind.
 *
 * @private
 * @param cwd - The working directory to clean.
 */
function cleanBunBuildArtifacts(cwd: string): void {
  readdirSync(cwd)
    .filter((name) => name.endsWith('.bun-build'))
    .map((name) => join(cwd, name))
    .map(unlinkSync)
}
