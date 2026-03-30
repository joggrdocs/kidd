import { err, ok } from '@kidd-cli/utils/fp'
import { attemptAsync } from 'es-toolkit'
import { build as tsdownBuild } from 'tsdown'

import { mapToWatchConfig } from './map-config.js'
import { readVersion } from '../config/read-version.js'
import { resolveConfig } from '../config/resolve-config.js'
import type { AsyncBundlerResult, WatchParams } from '../types.js'

/**
 * Start a watch-mode build for a kidd CLI tool using tsdown.
 *
 * The returned promise resolves only when tsdown's watch terminates (typically on process exit).
 * tsdown's `build()` with `watch: true` runs indefinitely.
 *
 * @param params - The watch parameters including config, working directory, and optional success callback.
 * @returns A result tuple with void on success or an Error on failure.
 */
export async function watch(params: WatchParams): AsyncBundlerResult<void> {
  const resolved = resolveConfig(params)

  const [, versionResult] = await readVersion(params.cwd)
  const version = versionResult ?? undefined

  const watchConfig = mapToWatchConfig({
    config: resolved,
    onSuccess: params.onSuccess,
    version,
  })

  const [watchError] = await attemptAsync(() => tsdownBuild(watchConfig))
  if (watchError) {
    return err(new Error('tsdown watch failed', { cause: watchError }))
  }

  return ok()
}
