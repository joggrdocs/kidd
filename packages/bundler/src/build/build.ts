import { execFile as execFileCb } from 'node:child_process'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { err, ok } from '@kidd-cli/utils/fp'
import type { AsyncResult } from '@kidd-cli/utils/fp'
import { attempt, attemptAsync } from 'es-toolkit'

import { buildRunnerConfig } from './bun-config.js'
import type { BunRunnerConfig } from './bun-config.js'
import { cleanBuildArtifacts } from './clean.js'
import { readVersion } from '../config/read-version.js'
import { resolveConfig } from '../config/resolve-config.js'
import { SHEBANG } from '../constants.js'
import type { AsyncBundlerResult, BuildOutput, BuildParams } from '../types.js'

/**
 * Result returned from the Bun runner subprocess.
 */
interface RunnerResult {
  readonly success: boolean
  readonly entryFile: string | undefined
  readonly errors: readonly string[]
}

/**
 * Build a kidd CLI tool using Bun.build via a subprocess.
 *
 * Resolves defaults, reads the project version from package.json, builds a
 * serializable config, writes it to a temp file, and spawns `bun` to execute
 * the runner script. When `clean` is enabled (the default), build artifacts
 * are removed before bundling. A shebang is prepended to the output entry.
 *
 * @param params - The build parameters including config and working directory.
 * @returns A result tuple with build output on success or an Error on failure.
 */
export async function build(params: BuildParams): AsyncBundlerResult<BuildOutput> {
  const resolved = resolveConfig(params)
  const compile = !!params.config.compile

  if (resolved.build.clean) {
    const [cleanError] = attempt(() =>
      cleanBuildArtifacts({ compile, outDir: resolved.buildOutDir })
    )
    if (cleanError) {
      return err(
        new Error(`failed to clean build artifacts in ${resolved.buildOutDir}`, { cause: cleanError })
      )
    }
  }

  const [, versionResult] = await readVersion(params.cwd)
  const version = versionResult ?? undefined

  const runnerConfig = buildRunnerConfig({ compile, config: resolved, version })

  const [buildError, buildResult] = await spawnBunBuild(runnerConfig)
  if (buildError) {
    return err(buildError)
  }

  if (!buildResult.entryFile) {
    return err(new Error(`build produced no entry file in ${resolved.buildOutDir}`))
  }

  const [shebanError] = await prependShebang(buildResult.entryFile)
  if (shebanError) {
    return err(new Error('failed to prepend shebang to entry file', { cause: shebanError }))
  }

  return ok({
    entryFile: buildResult.entryFile,
    outDir: resolved.buildOutDir,
    version,
  })
}

// ---------------------------------------------------------------------------

/**
 * Spawn the Bun runner subprocess to perform the actual build.
 *
 * Writes the config to a temporary JSON file, resolves the runner script path,
 * and executes `bun <runner> <config>`. Parses the JSON result from stdout.
 *
 * @private
 * @param config - The serializable runner config.
 * @returns A result tuple with the parsed runner result or an Error.
 */
async function spawnBunBuild(
  config: BunRunnerConfig
): AsyncBundlerResult<RunnerResult> {
  const configPath = join(tmpdir(), `kidd-build-${Date.now()}.json`)
  await writeFile(configPath, JSON.stringify(config), 'utf-8')

  const runnerPath = join(dirname(fileURLToPath(import.meta.url)), 'bun-runner.js')

  const [execError, stdout] = await execBun([runnerPath, configPath])

  await unlink(configPath).catch(() => undefined)

  if (execError) {
    return err(new Error('bun build failed', { cause: execError }))
  }

  const parsed = parseRunnerResult(stdout)
  if (!parsed) {
    return err(new Error('failed to parse bun build result'))
  }

  if (!parsed.success) {
    const message = parsed.errors.length > 0
      ? `bun build failed: ${parsed.errors.join(', ')}`
      : 'bun build failed'
    return err(new Error(message))
  }

  return ok(parsed)
}

/**
 * Prepend the Node.js shebang line to a built entry file.
 *
 * Bun.build has no `banner` option, so we read the file and prepend manually.
 *
 * @private
 * @param filePath - Absolute path to the entry file.
 * @returns A result tuple with void on success or an Error on failure.
 */
async function prependShebang(filePath: string): AsyncResult<void> {
  const [readError, contents] = await attemptAsync(() => readFile(filePath, 'utf-8'))
  if (readError) {
    return err(readError)
  }

  const [writeError] = await attemptAsync(() => writeFile(filePath, `${SHEBANG}${contents}`, 'utf-8'))
  if (writeError) {
    return err(writeError)
  }

  return ok()
}

/**
 * Parse the JSON result from the runner subprocess stdout.
 *
 * @private
 * @param stdout - The raw stdout string from the subprocess.
 * @returns The parsed runner result, or `undefined` if parsing fails.
 */
function parseRunnerResult(stdout: string): RunnerResult | undefined {
  const [parseError, result] = attempt(() => JSON.parse(stdout) as RunnerResult)
  if (parseError) {
    return undefined
  }

  return result ?? undefined
}

/**
 * Promisified wrapper around `execFile` to invoke `bun`.
 *
 * @private
 * @param args - Arguments to pass to `bun`.
 * @returns A result tuple with stdout on success or an Error on failure.
 */
function execBun(args: readonly string[]): AsyncResult<string> {
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
