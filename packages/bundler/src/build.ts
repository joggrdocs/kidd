import { err, ok } from '@kidd-cli/utils/fp'
import { build as tsdownBuild } from 'tsdown'

import { mapToBuildConfig } from './map-config.js'
import { detectBuildEntry, resolveConfig } from './resolve-config.js'
import type { AsyncBundlerResult, BuildOutput, BuildParams } from './types.js'

/**
 * Build a kidd CLI tool using tsdown.
 *
 * Resolves defaults, maps the config to tsdown's InlineConfig, and invokes the build.
 *
 * @param params - The build parameters including config and working directory.
 * @returns A result tuple with build output on success or an Error on failure.
 */
export async function build(params: BuildParams): AsyncBundlerResult<BuildOutput> {
  const resolved = resolveConfig(params)
  const inlineConfig = mapToBuildConfig(resolved)

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
  })
}
