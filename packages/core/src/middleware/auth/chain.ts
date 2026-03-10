import { join } from 'node:path'

import { match } from 'ts-pattern'

import type { Prompts } from '@/context/types.js'

import {
  DEFAULT_AUTH_FILENAME,
  DEFAULT_DEVICE_CODE_POLL_INTERVAL,
  DEFAULT_DEVICE_CODE_TIMEOUT,
  DEFAULT_OAUTH_CALLBACK_PATH,
  DEFAULT_OAUTH_PORT,
  DEFAULT_OAUTH_TIMEOUT,
  deriveTokenVar,
} from './constants.js'
import { resolveFromDeviceCode } from './strategies/device-code.js'
import { resolveFromDotenv } from './strategies/dotenv.js'
import { resolveFromEnv } from './strategies/env.js'
import { resolveFromFile } from './strategies/file.js'
import { resolveFromOAuth } from './strategies/oauth.js'
import { resolveFromToken } from './strategies/token.js'
import type { AuthCredential, ResolverConfig } from './types.js'

const DEFAULT_PROMPT_MESSAGE = 'Enter your API key'

/**
 * Chain credential resolvers, returning the first non-null result.
 *
 * Walks the resolver list in order, dispatching each config to the
 * appropriate resolver function via pattern matching. Short-circuits
 * on the first successful resolution.
 *
 * @param options - Options with resolvers, CLI name, and prompts instance.
 * @returns The first resolved credential, or null if all resolvers fail.
 */
export async function runStrategyChain(options: {
  readonly resolvers: readonly ResolverConfig[]
  readonly cliName: string
  readonly prompts: Prompts
}): Promise<AuthCredential | null> {
  const defaultTokenVar = deriveTokenVar(options.cliName)

  return tryResolvers(options.resolvers, 0, defaultTokenVar, options)
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Return the given value when defined, otherwise the fallback.
 *
 * @private
 * @param value - The optional value.
 * @param fallback - The default value.
 * @returns The resolved value.
 */
function withDefault<T>(value: T | undefined, fallback: T): T {
  if (value !== undefined) {
    return value
  }
  return fallback
}

/**
 * Recursively try resolvers until one returns a credential or the list is exhausted.
 *
 * @private
 * @param configs - The resolver configs.
 * @param index - The current index.
 * @param defaultTokenVar - The derived default token env var name.
 * @param context - The resolve options for prompts access.
 * @returns The first resolved credential, or null.
 */
async function tryResolvers(
  configs: readonly ResolverConfig[],
  index: number,
  defaultTokenVar: string,
  context: {
    readonly cliName: string
    readonly prompts: Prompts
  }
): Promise<AuthCredential | null> {
  if (index >= configs.length) {
    return null
  }

  const config = configs[index]

  if (config === undefined) {
    return null
  }

  const credential = await dispatchResolver(config, defaultTokenVar, context)

  if (credential) {
    return credential
  }

  return tryResolvers(configs, index + 1, defaultTokenVar, context)
}

/**
 * Dispatch a single resolver config to its implementation.
 *
 * @private
 * @param config - The resolver config to dispatch.
 * @param defaultTokenVar - The derived default token env var name.
 * @param context - The resolve options for prompts access.
 * @returns The resolved credential, or null.
 */
async function dispatchResolver(
  config: ResolverConfig,
  defaultTokenVar: string,
  context: {
    readonly cliName: string
    readonly prompts: Prompts
  }
): Promise<AuthCredential | null> {
  return match(config)
    .with({ source: 'env' }, (c): AuthCredential | null =>
      resolveFromEnv({
        tokenVar: withDefault(c.tokenVar, defaultTokenVar),
      })
    )
    .with({ source: 'dotenv' }, (c): AuthCredential | null =>
      resolveFromDotenv({
        path: withDefault(c.path, join(process.cwd(), '.env')),
        tokenVar: withDefault(c.tokenVar, defaultTokenVar),
      })
    )
    .with({ source: 'file' }, (c): AuthCredential | null =>
      resolveFromFile({
        dirName: withDefault(c.dirName, `.${context.cliName}`),
        filename: withDefault(c.filename, DEFAULT_AUTH_FILENAME),
      })
    )
    .with(
      { source: 'oauth' },
      (c): Promise<AuthCredential | null> =>
        resolveFromOAuth({
          authUrl: c.authUrl,
          callbackPath: withDefault(c.callbackPath, DEFAULT_OAUTH_CALLBACK_PATH),
          clientId: c.clientId,
          port: withDefault(c.port, DEFAULT_OAUTH_PORT),
          scopes: withDefault(c.scopes, []),
          timeout: withDefault(c.timeout, DEFAULT_OAUTH_TIMEOUT),
          tokenUrl: c.tokenUrl,
        })
    )
    .with(
      { source: 'device-code' },
      (c): Promise<AuthCredential | null> =>
        resolveFromDeviceCode({
          clientId: c.clientId,
          deviceAuthUrl: c.deviceAuthUrl,
          pollInterval: withDefault(c.pollInterval, DEFAULT_DEVICE_CODE_POLL_INTERVAL),
          prompts: context.prompts,
          scopes: withDefault(c.scopes, []),
          timeout: withDefault(c.timeout, DEFAULT_DEVICE_CODE_TIMEOUT),
          tokenUrl: c.tokenUrl,
        })
    )
    .with(
      { source: 'token' },
      (c): Promise<AuthCredential | null> =>
        resolveFromToken({
          message: withDefault(c.message, DEFAULT_PROMPT_MESSAGE),
          prompts: context.prompts,
        })
    )
    .with({ source: 'custom' }, (c): Promise<AuthCredential | null> | AuthCredential | null =>
      c.resolver()
    )
    .exhaustive()
}
