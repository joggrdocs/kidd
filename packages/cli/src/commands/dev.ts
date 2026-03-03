import { watch } from '@kidd/bundler'
import type { KiddConfig } from '@kidd/config'
import { loadConfig } from '@kidd/config/loader'
import type { LoadConfigResult } from '@kidd/config/loader'
import { command } from 'kidd'
import type { Command, Context } from 'kidd'

/**
 * Start a kidd CLI project in development mode with file watching.
 *
 * Loads the project's `kidd.config.ts`, starts tsdown in watch mode, and
 * logs rebuild status on each successful build.
 */
const devCommand: Command = command({
  description: 'Start a kidd CLI project in development mode',
  handler: async (ctx: Context) => {
    const cwd = process.cwd()

    const [configError, configResult] = await loadConfig({ cwd })
    const config = extractConfig(configResult)

    if (configError) {
      // No config file found — all KiddConfig fields are optional, so defaults apply.
    }

    ctx.spinner.start('Starting dev server...')

    const onSuccess = createOnSuccess(ctx)

    const [watchError] = await watch({ config, cwd, onSuccess })

    if (watchError) {
      ctx.spinner.stop('Watch failed')
      ctx.fail(watchError.message)
    }
  },
})

export default devCommand

// ---------------------------------------------------------------------------

/**
 * Extract a KiddConfig from a load result, falling back to empty defaults.
 *
 * @private
 * @param result - The result from loadConfig, or null when loading failed.
 * @returns The loaded config or an empty object (all KiddConfig fields are optional).
 */
function extractConfig(result: LoadConfigResult | null): KiddConfig {
  if (result) {
    return result.config
  }

  return {}
}

/**
 * Create an onSuccess callback that tracks first-build state.
 *
 * On the first invocation the spinner is stopped and a "watching" message is
 * logged. Subsequent invocations log a "rebuilt" message instead.
 *
 * Uses a mutable container object inside the closure to track build count
 * without `let` reassignment.
 *
 * @private
 * @param ctx - The command context for spinner and logger access.
 * @returns A callback suitable for the watch `onSuccess` parameter.
 */
function createOnSuccess(ctx: Context): () => void {
  const state = { buildCount: 0 }

  return () => {
    if (state.buildCount === 0) {
      state.buildCount = 1
      ctx.spinner.stop('Watching for changes...')
      return
    }

    ctx.logger.success('Rebuilt successfully')
  }
}
