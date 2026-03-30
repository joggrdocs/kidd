import { err, ok } from '@kidd-cli/utils/fp'
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
 * the build. When `clean` is enabled (the default), only kidd build artifacts
 * are removed — foreign files in the output directory are preserved and a
 * warning is printed.
 *
 * @param params - The build parameters including config and working directory.
 * @returns A result tuple with build output on success or an Error on failure.
 */
export async function build(params: BuildParams): AsyncBundlerResult<BuildOutput> {
  const resolved = resolveConfig(params)

  if (resolved.build.clean) {
    const cleanResult = cleanBuildArtifacts(resolved.buildOutDir)

    if (cleanResult.foreign.length > 0) {
      console.warn(
        `[kidd-bundler] foreign files detected in ${resolved.buildOutDir} (not removed):\n  ${cleanResult.foreign.join('\n  ')}`
      )
    }
  }

  const [versionError, versionResult] = await readVersion(params.cwd)
  if (versionError) {
    console.warn('[kidd-bundler] could not read version from package.json:', versionError.message)
  }
  const version = versionResult ?? undefined

  const inlineConfig = mapToBuildConfig({ config: resolved, version })

  try {
    await tsdownBuild(inlineConfig)
  } catch (error: unknown) {
    console.error('[kidd-bundler] build error:', error)
    return err(new Error('tsdown build failed', { cause: error }))
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
