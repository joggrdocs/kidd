import { execFile as execFileCb } from 'node:child_process'
import { readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import type { CompileTarget } from '@kidd-cli/config'
import { err, ok } from '@kidd-cli/utils/fp'
import type { AsyncResult } from '@kidd-cli/utils/fp'
import { attemptAsync } from 'es-toolkit'

import { detectBuildEntry, resolveConfig } from '../config/resolve-config.js'
import { DEFAULT_COMPILE_TARGETS } from '../constants.js'
import type { CompileOutput, CompileParams, CompiledBinary } from '../types.js'

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
  const [bunCheckError] = await checkBunExists()
  if (bunCheckError) {
    return err(bunCheckError)
  }

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
        verbose: params.verbose ?? false,
      })

      if (result[0] === null && params.onTargetComplete) {
        await params.onTargetComplete(target)
      }

      return result
    })
  )

  await cleanBunBuildArtifacts(resolved.cwd)

  const failedResult = results.find((r) => r[0] !== null)
  if (failedResult) {
    return err(failedResult[0])
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
  readonly verbose: boolean
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
  ]

  const [execError] = await execBunBuild(args)
  if (execError) {
    return err(
      new Error(formatCompileError(params.target, execError, params.verbose), { cause: execError })
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
 * Build a descriptive error message for a failed compile target.
 *
 * When verbose is enabled, extracts stderr from the exec error so the
 * underlying bun error is surfaced instead of being buried in the cause chain.
 *
 * @private
 * @param target - The compile target that failed.
 * @param execError - The error returned by execFile.
 * @param verbose - Whether to include stderr output in the message.
 * @returns A formatted error message, including stderr when verbose is true.
 */
function formatCompileError(target: CompileTarget, execError: Error, verbose: boolean): string {
  const header = `bun build --compile failed for target ${target}`

  if (!verbose) {
    return header
  }

  const { stderr } = execError as { stderr?: string }
  if (stderr && stderr.trim().length > 0) {
    return `${header}\n${stderr.trim()}`
  }

  return header
}

/**
 * Check whether the `bun` binary is available on the system PATH.
 *
 * @private
 * @returns A result tuple with `null` on success or an Error when `bun` is not found.
 */
function checkBunExists(): AsyncResult<null> {
  return new Promise((resolve) => {
    execFileCb('bun', ['--version'], (error) => {
      if (error) {
        resolve(
          err(
            new Error(
              'bun is not installed or not found in PATH. Install it from https://bun.sh to use compile.'
            )
          )
        )
        return
      }

      resolve(ok(null))
    })
  })
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
    execFileCb('bun', [...args], (error, stdout, stderr) => {
      if (error) {
        const enriched = Object.assign(error, { stderr })
        resolve(err(enriched))
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
async function cleanBunBuildArtifacts(cwd: string): Promise<void> {
  const [readError, entries] = await attemptAsync(() => readdir(cwd))
  if (readError || !entries) {
    return
  }

  const artifacts = entries
    .filter((name) => name.endsWith('.bun-build'))
    .map((name) => join(cwd, name))

  await Promise.allSettled(artifacts.map((filePath) => unlink(filePath)))
}
