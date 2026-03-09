/**
 * HTTP client middleware factory.
 *
 * Creates a middleware that decorates the context with a typed
 * {@link HttpClient} bound to a base URL and optional headers.
 *
 * This middleware is fully decoupled from auth. For automatic credential
 * injection, use `auth({ http: { ... } })` instead.
 *
 * @module
 */

import { decorateContext } from '@/context/decorate.js'
import type { Context } from '@/context/types.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types.js'

import { createHttpClient } from './create-http-client.js'
import type { HttpOptions } from './types.js'

/**
 * Create an HTTP client middleware that decorates the context
 * with a typed client.
 *
 * Resolves headers from the `headers` option (static record or function),
 * builds a typed {@link HttpClient}, and attaches it to `ctx[namespace]`.
 *
 * @param options - HTTP middleware configuration.
 * @returns A Middleware that adds an HttpClient to ctx[namespace].
 */
export function http(options: HttpOptions): Middleware {
  const { namespace, baseUrl, headers } = options

  return middleware((ctx, next) => {
    const resolvedHeaders = resolveHeaders(ctx, headers)

    const client = createHttpClient({
      baseUrl,
      defaultHeaders: resolvedHeaders,
    })

    decorateContext(ctx, namespace, client)

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve headers from the options value.
 *
 * Calls the function form with ctx when provided, returns static headers
 * directly, or returns undefined when no headers are configured.
 *
 * @private
 * @param ctx - The context object.
 * @param headers - The headers option (static, function, or undefined).
 * @returns The resolved headers record or undefined.
 */
function resolveHeaders(
  ctx: Context,
  headers: HttpOptions['headers']
): Readonly<Record<string, string>> | undefined {
  if (headers === undefined) {
    return undefined
  }

  if (typeof headers === 'function') {
    return headers(ctx)
  }

  return headers
}
