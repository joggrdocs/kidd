import { err, ok } from '@kidd-cli/utils/fp'
import { attemptAsync } from 'es-toolkit'
import { build as tsdownBuild } from 'tsdown'

import { toTsdownWatchConfig } from './config.js'
import { readVersion } from '../config/read-version.js'
import type { AsyncBundlerResult, ResolvedBundlerConfig } from '../types.js'

/**
 * Start a watch-mode build using tsdown.
 *
 * The returned promise resolves only when tsdown's watch terminates (typically on process exit).
 *
 * @param params - The resolved config and optional success callback.
 * @returns A result tuple with void on success or an Error on failure.
 */
export async function watch(params: {
  readonly resolved: ResolvedBundlerConfig
  readonly onSuccess?: () => void | Promise<void>
}): AsyncBundlerResult<void> {
  const [, versionResult] = await readVersion(params.resolved.cwd)
  const version = versionResult ?? undefined

  const watchConfig = toTsdownWatchConfig({
    config: params.resolved,
    onSuccess: params.onSuccess,
    version,
  })

  const [watchError] = await attemptAsync(() => tsdownBuild(watchConfig))
  if (watchError) {
    return err(new Error('tsdown watch failed', { cause: watchError }))
  }

  return ok()
}
