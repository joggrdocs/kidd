/**
 * Factory for the {@link AuthContext} object decorated onto `ctx.auth`.
 *
 * Closes over the middleware's resolver config, CLI name, prompts, and
 * a credential resolver function so that `authenticate()` can run
 * interactive resolvers and persist the result.
 *
 * @module
 */

import type { AsyncResult, Result } from '@kidd-cli/utils/fp'
import { ok } from '@kidd-cli/utils/fp'

import type { Prompts } from '@/context/types.js'
import { createStore } from '@/lib/store/create-store.js'

import { DEFAULT_AUTH_FILENAME } from './constants.js'
import { resolveCredentials } from './resolve-credentials.js'
import type { AuthContext, AuthCredential, LoginError, ResolverConfig } from './types.js'

/**
 * Options for {@link createAuthContext}.
 */
export interface CreateAuthContextOptions {
  readonly resolvers: readonly ResolverConfig[]
  readonly cliName: string
  readonly prompts: Prompts
  readonly resolveCredential: () => AuthCredential | null
}

/**
 * Create an {@link AuthContext} value for `ctx.auth`.
 *
 * No credential data is stored on the returned object. `credential()`
 * resolves passively on every call, `authenticated()` checks existence,
 * and `authenticate()` runs the configured interactive resolvers, saves
 * the credential to the global file store, and returns a Result.
 *
 * @param options - Factory options.
 * @returns An AuthContext instance.
 */
export function createAuthContext(options: CreateAuthContextOptions): AuthContext {
  const { resolvers, cliName, prompts, resolveCredential } = options

  /**
   * Resolve the current credential from passive sources (file, env).
   *
   * @private
   * @returns The credential, or null when none exists.
   */
  function credential(): AuthCredential | null {
    return resolveCredential()
  }

  /**
   * Check whether a credential is available from passive sources.
   *
   * @private
   * @returns True when a credential exists.
   */
  function authenticated(): boolean {
    return resolveCredential() !== null
  }

  /**
   * Run configured resolvers interactively and persist the credential.
   *
   * @private
   * @returns A Result with the credential on success or a LoginError on failure.
   */
  async function authenticate(): AsyncResult<AuthCredential, LoginError> {
    const resolved = await resolveCredentials({ cliName, prompts, resolvers })

    if (resolved === null) {
      return loginError({ message: 'No credential resolved from any source', type: 'no_credential' })
    }

    const store = createStore({ dirName: `.${cliName}` })
    const [saveError] = store.save(DEFAULT_AUTH_FILENAME, resolved)

    if (saveError) {
      return loginError({
        message: `Failed to save credential: ${saveError.message}`,
        type: 'save_failed',
      })
    }

    return ok(resolved)
  }

  return { authenticate, authenticated, credential }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Construct a failure Result tuple with a {@link LoginError}.
 *
 * @private
 * @param error - The login error.
 * @returns A Result tuple `[LoginError, null]`.
 */
function loginError(error: LoginError): Result<never, LoginError> {
  return [error, null] as const
}
