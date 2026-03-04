import { middleware } from '@kidd-cli/core'

const MS_PER_SECOND = 1000

/**
 * Middleware that measures command execution time.
 *
 * Records the start time before the handler runs and logs
 * the elapsed duration after it completes.
 */
export default middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  const elapsed = (Date.now() - start) / MS_PER_SECOND
  ctx.logger.debug(`Completed in ${String(elapsed)}s`)
})
