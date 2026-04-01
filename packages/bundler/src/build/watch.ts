import { watch as fsWatch } from 'node:fs'

import { err, ok } from '@kidd-cli/utils/fp'
import { debounce } from 'es-toolkit'

import { build } from './build.js'
import type { AsyncBundlerResult, WatchParams } from '../types.js'

/**
 * Debounce interval in milliseconds for batching rapid file changes.
 */
const DEBOUNCE_MS = 250

/**
 * Start a watch-mode build for a kidd CLI tool.
 *
 * Runs an initial build, then watches the project directory for file changes
 * using `node:fs.watch`. Changes are debounced to avoid excessive rebuilds.
 * The `onSuccess` callback fires after each successful build.
 *
 * The returned promise resolves only when the process receives SIGINT or SIGTERM.
 *
 * @param params - The watch parameters including config, working directory, and optional success callback.
 * @returns A result tuple with void on success or an Error on failure.
 */
export async function watch(params: WatchParams): AsyncBundlerResult<void> {
  const [initialError] = await build({ config: params.config, cwd: params.cwd })
  if (initialError) {
    return err(new Error('initial build failed', { cause: initialError }))
  }

  if (params.onSuccess) {
    await params.onSuccess()
  }

  const rebuild = debounce(async () => {
    const [rebuildError] = await build({ config: params.config, cwd: params.cwd })
    if (!rebuildError && params.onSuccess) {
      await params.onSuccess()
    }
  }, DEBOUNCE_MS)

  const watcher = fsWatch(params.cwd, { recursive: true }, (_eventType, filename) => {
    if (shouldIgnore(filename)) {
      return
    }

    rebuild()
  })

  return new Promise((resolve) => {
    const cleanup = () => {
      watcher.close()
      resolve(ok())
    }

    process.once('SIGINT', cleanup)
    process.once('SIGTERM', cleanup)
  })
}

// ---------------------------------------------------------------------------

/**
 * Check whether a changed file should be ignored by the watcher.
 *
 * Ignores changes inside `node_modules`, `dist`, and dotfile directories.
 *
 * @private
 * @param filename - The relative filename from the watcher, or null.
 * @returns `true` when the file change should be skipped.
 */
function shouldIgnore(filename: string | null): boolean {
  if (!filename) {
    return true
  }

  const segments = filename.split('/')
  return segments.some((seg) => seg === 'node_modules' || seg === 'dist' || seg.startsWith('.'))
}
