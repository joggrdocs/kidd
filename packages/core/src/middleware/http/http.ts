/**
 * HTTP client middleware factory.
 *
 * Creates a middleware that decorates the context with a typed
 * {@link HttpClient} bound to a base URL and optional auth credentials.
 *
 * @module
 */

import { decorateContext } from '@/context/decorate.js'
import type { Context } from '@/context/types.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types.js'

import type { AuthCredential } from '../auth/types.js'
import { createHttpClient } from './create-http-client.js'
import type { HttpOptions } from './types.js'

/**
 * Create an HTTP client middleware that decorates the context
 * with a typed client.
 *
 * Reads auth credentials from `ctx.auth.credential()` (set by the auth
 * middleware), builds a typed {@link HttpClient}, and attaches it to
 * `ctx[namespace]`.
 *
 * @param options - HTTP middleware configuration.
 * @returns A Middleware that adds an HttpClient to ctx[namespace].
 */
export function http(options: HttpOptions): Middleware {
  const { namespace, baseUrl, defaultHeaders } = options

  return middleware(async (ctx, next) => {
    const credential = resolveCredential(ctx)

    const client = createHttpClient({
      baseUrl,
      credential,
      defaultHeaders,
    })

    decorateContext(ctx, namespace, client)

    await next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the auth credential from the context.
 *
 * Calls `ctx.auth.credential()` when the auth middleware has run.
 * Returns undefined when no auth context is available.
 *
 * @private
 * @param ctx - The context object.
 * @returns The credential or undefined.
 */
function resolveCredential(ctx: Context): AuthCredential | undefined {
  if (ctx.auth === undefined) {
    return undefined
  }

  const cred = ctx.auth.credential()

  if (cred === null) {
    return undefined
  }

  return cred
}
