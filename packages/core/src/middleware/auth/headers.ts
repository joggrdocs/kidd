import type { Context } from '@/context/types.js'

import { buildAuthHeaders } from '../http/build-auth-headers.js'
import type { AuthContext } from './types.js'

/**
 * Create a function that resolves auth credentials from `ctx.auth` into HTTP headers.
 *
 * The returned function reads `ctx.auth.credential()` and converts the credential
 * into the appropriate header format using `buildAuthHeaders()`. Returns an empty
 * record when no auth middleware is present or no credential exists.
 *
 * @returns A function that takes a Context and returns auth headers.
 */
export function createAuthHeaders(): (ctx: Context) => Readonly<Record<string, string>> {
  return function resolveHeaders(ctx: Context): Readonly<Record<string, string>> {
    if (!Object.hasOwn(ctx, 'auth')) {
      return {}
    }

    const authCtx = (ctx as Context & { readonly auth: AuthContext }).auth
    const credential = authCtx.credential()

    if (credential === null) {
      return {}
    }

    return buildAuthHeaders(credential)
  }
}
