import { withTag } from '@kidd/utils/tag'

import type { Middleware, MiddlewareFn } from './types.js'

/**
 * Create a typed middleware that runs before command handlers.
 *
 * @param handler - The middleware function receiving ctx and next.
 * @returns A Middleware object for use in the cli() middleware stack.
 */
export function middleware<TConfig extends Record<string, unknown> = Record<string, unknown>>(
  handler: MiddlewareFn<TConfig>
): Middleware<TConfig> {
  return withTag({ handler }, 'Middleware')
}
