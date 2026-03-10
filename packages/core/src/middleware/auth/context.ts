/**
 * Factory for the {@link AuthContext} object decorated onto `ctx.auth`.
 *
 * Closes over the middleware's strategy config, CLI name, prompts, and
 * a credential resolver function so that `login()` can run
 * interactive strategies and persist the result.
 *
 * @module
 */

import type { AsyncResult, Result } from '@kidd-cli/utils/fp'
import { ok } from '@kidd-cli/utils/fp'

import type { Prompts } from '@/context/types.js'
import { createStore } from '@/lib/store/create-store.js'

import { runStrategyChain } from './chain.js'
import { DEFAULT_AUTH_FILENAME } from './constants.js'
import type {
  AuthContext,
  AuthCredential,
  AuthError,
  LoginOptions,
  StrategyConfig,
} from './types.js'

/**
 * Options for {@link createAuthContext}.
 */
export interface CreateAuthContextOptions {
  readonly strategies: readonly StrategyConfig[]
  readonly cliName: string
  readonly prompts: Prompts
  readonly resolveCredential: () => AuthCredential | null
}

/**
 * Create an {@link AuthContext} value for `ctx.auth`.
 *
 * No credential data is stored on the returned object. `credential()`
 * resolves passively on every call, `authenticated()` checks existence,
 * `login()` runs the configured interactive strategies, saves the
 * credential to the global file store, and `logout()` removes it.
 *
 * @param options - Factory options.
 * @returns An AuthContext instance.
 */
export function createAuthContext(options: CreateAuthContextOptions): AuthContext {
  const { strategies, cliName, prompts, resolveCredential } = options

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
   * Run configured strategies interactively and persist the credential.
   *
   * When `loginOptions.strategies` is provided, those strategies are used
   * instead of the default configured list.
   *
   * @private
   * @param loginOptions - Optional overrides for the login attempt.
   * @returns A Result with the credential on success or an AuthError on failure.
   */
  async function login(loginOptions?: LoginOptions): AsyncResult<AuthCredential, AuthError> {
    const activeStrategies = resolveLoginStrategies(loginOptions, strategies)

    const resolved = await runStrategyChain({
      cliName,
      prompts,
      strategies: activeStrategies,
    })

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

/**
 * Resolve the active strategies for a login attempt.
 *
 * Returns the override strategies from login options when provided,
 * otherwise falls back to the configured strategies.
 *
 * @private
 * @param loginOptions - Optional login overrides.
 * @param configured - The default configured strategies.
 * @returns The strategies to use for the login attempt.
 */
function resolveLoginStrategies(
  loginOptions: LoginOptions | undefined,
  configured: readonly StrategyConfig[]
): readonly StrategyConfig[] {
  if (loginOptions !== undefined && loginOptions.strategies !== undefined) {
    return loginOptions.strategies
  }

  return configured
}
