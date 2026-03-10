import { watch } from '@kidd-cli/bundler'
import { loadConfig } from '@kidd-cli/config/loader'
import { command } from '@kidd-cli/core'
import type { Command, Context } from '@kidd-cli/core'

import { extractConfig } from '../lib/config-helpers.js'

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

    const [, configResult] = await loadConfig({ cwd })
    const config = extractConfig(configResult)

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
