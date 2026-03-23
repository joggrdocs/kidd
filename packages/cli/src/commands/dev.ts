import { watch } from '@kidd-cli/bundler'
import { loadConfig } from '@kidd-cli/config/loader'
import { command } from '@kidd-cli/core'
import type { Command, Context, Log, LogSpinner } from '@kidd-cli/core'

import { extractConfig } from '../lib/config-helpers.js'
import { resolveLog } from '../lib/resolve-log.js'

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

    const log = resolveLog(ctx)
    const spinner = log.spinner('Starting dev server...')

    const onSuccess = createOnSuccess({ log, spinner })

    const [watchError] = await watch({ config, cwd, onSuccess })

    if (watchError) {
      spinner.stop('Watch failed')
      return ctx.fail(watchError.message)
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
 * @param params - The log and spinner instances for output.
 * @returns A callback suitable for the watch `onSuccess` parameter.
 */
function createOnSuccess(params: { readonly log: Log; readonly spinner: LogSpinner }): () => void {
  const state = { buildCount: 0 }

  return () => {
    if (state.buildCount === 0) {
      state.buildCount = 1
      params.spinner.stop('Watching for changes...')
      return
    }

    params.log.success('Rebuilt successfully')
  }
}
