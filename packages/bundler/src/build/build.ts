import { execFile as execFileCb } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { err, ok } from '@kidd-cli/utils/fp'
import type { AsyncResult, Result } from '@kidd-cli/utils/fp'
import { attempt, attemptAsync } from 'es-toolkit'
import { z } from 'zod'

import { buildRunnerConfig } from './bun-config.js'
import type { BunRunnerConfig } from './bun-config.js'
import { cleanBuildArtifacts } from './clean.js'
import { readVersion } from '../config/read-version.js'
import { resolveConfig } from '../config/resolve-config.js'
import { SHEBANG } from '../constants.js'
import type { AsyncBundlerResult, BuildOutput, BuildParams } from '../types.js'

/**
 * Schema for validating the JSON result from the Bun runner subprocess.
 */
const RunnerResultSchema = z.object({
  success: z.boolean(),
  entryFile: z.string().optional(),
  errors: z.array(z.string()),
})

/**
 * Result returned from the Bun runner subprocess.
 */
type RunnerResult = z.infer<typeof RunnerResultSchema>

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
  const configPath = join(tmpdir(), `kidd-build-${randomUUID()}.json`)
  const [writeConfigError] = await attemptAsync(() =>
    writeFile(configPath, JSON.stringify(config), 'utf-8')
  )
  if (writeConfigError) {
    return err(new Error(`failed to write bun config ${configPath}`, { cause: writeConfigError }))
  }

  const runnerPath = join(dirname(fileURLToPath(import.meta.url)), 'bun-runner.js')

  const [execError, stdout] = await execBun([runnerPath, configPath])

  await unlink(configPath).catch(() => undefined)

  const [parseError, parsed] = parseRunnerResult(stdout ?? '')
  if (parseError) {
    const cause = execError ?? parseError
    return err(new Error('failed to parse bun build result', { cause }))
  }

  if (!parsed.success) {
    const message = parsed.errors.length > 0
      ? `bun build failed: ${parsed.errors.join(', ')}`
      : 'bun build failed'
    return err(new Error(message))
  }

  if (execError) {
    return err(new Error('bun build failed', { cause: execError }))
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
 * Parse and validate the JSON result from the runner subprocess stdout.
 *
 * @private
 * @param stdout - The raw stdout string from the subprocess.
 * @returns A result tuple with the validated runner result or an Error.
 */
function parseRunnerResult(stdout: string): Result<RunnerResult> {
  const [jsonError, json] = attempt(() => JSON.parse(stdout) as unknown)
  if (jsonError) {
    return err(new Error('failed to parse runner JSON', { cause: jsonError }))
  }

  const validated = RunnerResultSchema.safeParse(json)
  if (!validated.success) {
    return err(new Error('invalid runner result shape', { cause: validated.error }))
  }

  return ok(validated.data)
}

/**
 * Promisified wrapper around `execFile` to invoke `bun`.
 *
 * Always returns stdout so the caller can attempt to parse structured output
 * even when the subprocess exits with a non-zero code.
 *
 * @private
 * @param args - Arguments to pass to `bun`.
 * @returns A tuple of `[error | null, stdout]` where stdout is always present.
 */
function execBun(args: readonly string[]): Promise<readonly [Error | null, string]> {
  return new Promise((resolve) => {
    execFileCb('bun', [...args], (error, stdout, stderr) => {
      if (error) {
        const enriched = Object.assign(error, { stderr })
        resolve([enriched, stdout ?? ''])
        return
      }

      resolve([null, stdout])
    })
  })
}
