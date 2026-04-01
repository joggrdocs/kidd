import { err, ok } from '@kidd-cli/utils/fp'
import { attempt, attemptAsync } from 'es-toolkit'
import { build as tsdownBuild } from 'tsdown'

import { clean } from './clean.js'
import { toTsdownBuildConfig } from './config.js'
import { readVersion } from '../config/read-version.js'
import { detectBuildEntry } from '../config/resolve-config.js'
import type { AsyncBundlerResult, BuildOutput, ResolvedBundlerConfig } from '../types.js'

/**
 * Run the tsdown build with a resolved config.
 *
 * Cleans artifacts when enabled, reads the project version, maps to a tsdown
 * InlineConfig, and invokes tsdown's build API.
 *
 * @param params - The resolved config and whether compile mode is active.
 * @returns A result tuple with build output on success or an Error on failure.
 */
export async function build(params: {
  readonly resolved: ResolvedBundlerConfig
  readonly compile: boolean
}): AsyncBundlerResult<BuildOutput> {
  if (params.resolved.build.clean) {
    const [cleanError] = attempt(() =>
      clean({ compile: params.compile, outDir: params.resolved.buildOutDir })
    )
    if (cleanError) {
      return err(
        new Error(`failed to clean build artifacts in ${params.resolved.buildOutDir}`, { cause: cleanError })
      )
    }
  }

  const [, versionResult] = await readVersion(params.resolved.cwd)
  const version = versionResult ?? undefined

  const inlineConfig = toTsdownBuildConfig({
    compile: params.compile,
    config: params.resolved,
    version,
  })

  const [buildError] = await attemptAsync(() => tsdownBuild(inlineConfig))
  if (buildError) {
    return err(new Error('tsdown build failed', { cause: buildError }))
  }

  const entryFile = detectBuildEntry(params.resolved.buildOutDir)

  if (!entryFile) {
    return err(new Error(`build produced no entry file in ${params.resolved.buildOutDir}`))
  }

  return ok({
    entryFile,
    outDir: params.resolved.buildOutDir,
    version,
  })
}
