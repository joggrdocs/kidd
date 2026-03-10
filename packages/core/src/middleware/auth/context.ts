/**
 * Factory for the {@link AuthContext} object decorated onto `ctx.auth`.
 *
 * Closes over the middleware's resolver config, CLI name, prompts, and
 * a credential resolver function so that `login()` can run
 * interactive resolvers and persist the result.
 *
 * @module
 */

import type { AsyncResult, Result } from '@kidd-cli/utils/fp'
import { ok } from '@kidd-cli/utils/fp'

import type { Prompts } from '@/context/types.js'
import { createStore } from '@/lib/store/create-store.js'

import { runStrategyChain } from './chain.js'
import { DEFAULT_AUTH_FILENAME } from './constants.js'
import type { AuthContext, AuthCredential, AuthError, ResolverConfig } from './types.js'

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
 * `login()` runs the configured interactive resolvers, saves the
 * credential to the global file store, and `logout()` removes it.
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
   * @returns A Result with the credential on success or an AuthError on failure.
   */
  // TODO: support targeted resolver selection, e.g. ctx.auth.login({ source: 'token' })
  // to let callers skip to a specific resolver instead of walking the full chain.
  async function login(): AsyncResult<AuthCredential, AuthError> {
    const resolved = await runStrategyChain({ cliName, prompts, resolvers })

    if (resolved === null) {
      return authError({
        message: 'No credential resolved from any source',
        type: 'no_credential',
      })
    }

    const store = createStore({ dirName: `.${cliName}` })
    const [saveError] = store.save(DEFAULT_AUTH_FILENAME, resolved)

    if (saveError) {
      return authError({
        message: `Failed to save credential: ${saveError.message}`,
        type: 'save_failed',
      })
    }

    return ok(resolved)
  }

  /**
   * Remove the stored credential from disk.
   *
   * @private
   * @returns A Result with the removed file path on success or an AuthError on failure.
   */
  async function logout(): AsyncResult<string, AuthError> {
    const store = createStore({ dirName: `.${cliName}` })
    const [removeError, filePath] = store.remove(DEFAULT_AUTH_FILENAME)

    if (removeError) {
      return authError({
        message: `Failed to remove credential: ${removeError.message}`,
        type: 'remove_failed',
      })
    }

    return ok(filePath)
  }

  return { authenticated, credential, login, logout }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Construct a failure Result tuple with an {@link AuthError}.
 *
 * @private
 * @param error - The auth error.
 * @returns A Result tuple `[AuthError, null]`.
 */
function authError(error: AuthError): Result<never, AuthError> {
  return [error, null] as const
}
