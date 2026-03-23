import type { Context, Log } from '@kidd-cli/core'

/**
 * Extract the `log` instance from a context decorated by the `logger()` middleware.
 *
 * The root-level `logger()` middleware attaches `log` to the context at runtime
 * via `decorateContext`, but the base `Context` type does not include it
 * statically. This helper safely narrows the type so commands can access `log`
 * without repeating the cast inline.
 *
 * @param ctx - The command context (must have been decorated by `logger()` middleware).
 * @returns The `Log` instance attached to the context.
 */
export function resolveLog(ctx: Context): Log {
  return (ctx as unknown as { readonly log: Log }).log
}
