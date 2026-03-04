import { join } from 'node:path'

import { match } from 'ts-pattern'

import type { Prompts } from '@/context/types.js'

import { DEFAULT_AUTH_FILENAME, deriveTokenVar } from './constants.js'
import { resolveFromDotenv } from './resolve-dotenv.js'
import { resolveFromEnv } from './resolve-env.js'
import { resolveFromFile } from './resolve-file.js'
import { resolveFromOAuth } from './resolve-oauth.js'
import { resolveFromPrompt } from './resolve-prompt.js'
import type { AuthCredential, ResolverConfig } from './types.js'

const DEFAULT_OAUTH_PORT = 0
const DEFAULT_OAUTH_CALLBACK_PATH = '/callback'
const DEFAULT_OAUTH_TIMEOUT = 120_000
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
export async function resolveCredentials(options: {
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
        tokenVar: resolveOptionalString(c.tokenVar, defaultTokenVar),
      })
    )
    .with({ source: 'dotenv' }, (c): AuthCredential | null =>
      resolveFromDotenv({
        path: resolveOptionalString(c.path, join(process.cwd(), '.env')),
        tokenVar: resolveOptionalString(c.tokenVar, defaultTokenVar),
      })
    )
    .with({ source: 'file' }, (c): AuthCredential | null =>
      resolveFromFile({
        dirName: resolveOptionalString(c.dirName, `.${context.cliName}`),
        filename: resolveOptionalString(c.filename, DEFAULT_AUTH_FILENAME),
      })
    )
    .with(
      { source: 'oauth' },
      (c): Promise<AuthCredential | null> =>
        resolveFromOAuth({
          authUrl: c.authUrl,
          callbackPath: resolveOptionalString(c.callbackPath, DEFAULT_OAUTH_CALLBACK_PATH),
          port: resolveOptionalNumber(c.port, DEFAULT_OAUTH_PORT),
          timeout: resolveOptionalNumber(c.timeout, DEFAULT_OAUTH_TIMEOUT),
        })
    )
    .with(
      { source: 'prompt' },
      (c): Promise<AuthCredential | null> =>
        resolveFromPrompt({
          message: resolveOptionalString(c.message, DEFAULT_PROMPT_MESSAGE),
          prompts: context.prompts,
        })
    )
    .with({ source: 'custom' }, (c): Promise<AuthCredential | null> | AuthCredential | null =>
      c.resolver()
    )
    .exhaustive()
}

/**
 * Resolve an optional string value, falling back to a default.
 *
 * @private
 * @param value - The optional value.
 * @param fallback - The default value.
 * @returns The resolved string.
 */
function resolveOptionalString(value: string | undefined, fallback: string): string {
  if (value !== undefined) {
    return value
  }
  return fallback
}

/**
 * Resolve an optional number value, falling back to a default.
 *
 * @private
 * @param value - The optional value.
 * @param fallback - The default value.
 * @returns The resolved number.
 */
function resolveOptionalNumber(value: number | undefined, fallback: number): number {
  if (value !== undefined) {
    return value
  }
  return fallback
}
