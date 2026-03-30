import { err, ok } from '@kidd-cli/utils/fp'
import { attempt, attemptAsync } from 'es-toolkit'
import { build as tsdownBuild } from 'tsdown'

import { cleanBuildArtifacts } from './clean.js'
import { mapToBuildConfig } from './map-config.js'
import { readVersion } from '../config/read-version.js'
import { detectBuildEntry, resolveConfig } from '../config/resolve-config.js'
import type { AsyncBundlerResult, BuildOutput, BuildParams } from '../types.js'

/**
 * Build a kidd CLI tool using tsdown.
 *
 * Resolves defaults, reads the project version from package.json, maps the
 * config to tsdown's InlineConfig (injecting `__KIDD_VERSION__`), and invokes
 * the build. When `clean` is enabled (the default), build artifacts (and
 * compiled binaries when `compile` is set) are removed before bundling.
 *
 * @param params - The build parameters including config and working directory.
 * @returns A result tuple with build output on success or an Error on failure.
 */
export async function build(params: BuildParams): AsyncBundlerResult<BuildOutput> {
  const resolved = resolveConfig(params)
  const compile = !!params.config.compile

  if (resolved.build.clean) {
    const [cleanError] = attempt(() => cleanBuildArtifacts(resolved.buildOutDir, compile))
    if (cleanError) {
      return err(
        new Error(`failed to clean build artifacts in ${resolved.buildOutDir}`, { cause: cleanError })
      )
    }
  }

  const [, versionResult] = await readVersion(params.cwd)
  const version = versionResult ?? undefined

  const inlineConfig = mapToBuildConfig({ compile, config: resolved, version })

  const [buildError] = await attemptAsync(() => tsdownBuild(inlineConfig))
  if (buildError) {
    return err(new Error('tsdown build failed', { cause: buildError }))
  }

  const entryFile = detectBuildEntry(resolved.buildOutDir)

  if (!entryFile) {
    return err(new Error(`build produced no entry file in ${resolved.buildOutDir}`))
  }

  return ok({
    entryFile,
    outDir: resolved.buildOutDir,
    version,
  })
}
