import { err, ok } from '@kidd-cli/utils/fp'
import { attemptAsync } from 'es-toolkit'
import { build as tsdownBuild } from 'tsdown'

import { resolveBuildVars, toTsdownBuildConfig } from './config.js'
import { clean } from '../utils/clean.js'
import { resolveBuildEntry } from '../utils/resolve-build-entry.js'
import type { AsyncBundlerResult, BuildOutput, ResolvedBundlerConfig } from '../types.js'

// ---------------------------------------------------------------------------

/**
 * Build a descriptive error message for a failed tsdown operation.
 *
 * @param phase - The tsdown phase that failed (build or watch).
 * @param error - The error returned by tsdown.
 * @param verbose - Whether to include the full error details.
 * @returns A formatted error message.
 */
export function formatBuildError(phase: 'build' | 'watch', error: unknown, verbose: boolean): string {
  const header = `tsdown ${phase} failed`

  if (!verbose) {
    return header
  }

  const detail = error instanceof Error ? error.message : String(error)
  if (detail.trim().length > 0) {
    return `${header}\n${detail.trim()}`
  }

  return header
}

/**
 * Run the tsdown build with a resolved config.
 *
 * Cleans artifacts when enabled, maps to a tsdown InlineConfig, and invokes
 * tsdown's build API.
 *
 * @param params - The resolved config and whether compile mode is active.
 * @returns A result tuple with build output on success or an Error on failure.
 */
export async function build(params: {
  readonly resolved: ResolvedBundlerConfig
  readonly compile: boolean
  readonly verbose?: boolean
}): AsyncBundlerResult<BuildOutput> {
  if (params.resolved.build.clean) {
    await clean({ resolved: params.resolved, compile: params.compile })
  }

  const inlineConfig = toTsdownBuildConfig({
    compile: params.compile,
    config: params.resolved,
  })

  const [buildError] = await attemptAsync(() => tsdownBuild(inlineConfig))
  if (buildError) {
    return err(new Error(formatBuildError('build', buildError, params.verbose ?? false), { cause: buildError }))
  }

  const entryFile = await resolveBuildEntry(params.resolved.buildOutDir)

  if (!entryFile) {
    return err(new Error(`build produced no entry file in ${params.resolved.buildOutDir}`))
  }

  return ok({
    define: { ...resolveBuildVars(), ...params.resolved.build.define },
    entryFile,
    outDir: params.resolved.buildOutDir,
    version: params.resolved.version,
  })
}
