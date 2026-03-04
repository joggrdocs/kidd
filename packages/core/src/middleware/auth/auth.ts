/**
 * Auth middleware factory.
 *
 * Decorates `ctx.auth` with functions to resolve credentials on demand
 * and run interactive authentication.
 *
 * @module
 */

import { decorateContext } from '@/context/decorate.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types.js'

import { DEFAULT_AUTH_FILENAME, deriveTokenVar } from './constants.js'
import { createAuthContext } from './create-auth-context.js'
import { resolveFromEnv } from './resolve-env.js'
import { resolveFromFile } from './resolve-file.js'
import type { AuthCredential, AuthOptions, ResolverConfig } from './types.js'

/**
 * Create an auth middleware that decorates `ctx.auth`.
 *
 * No credential data is stored on the context. `ctx.auth.credential()`
 * resolves passively from two sources on every call:
 * 1. File — `~/.cli-name/auth.json`
 * 2. Env — `CLI_NAME_TOKEN`
 *
 * Interactive resolvers (OAuth, prompt, custom) only run when the
 * command handler explicitly calls `ctx.auth.authenticate()`.
 *
 * @param options - Auth middleware configuration.
 * @returns A Middleware that decorates ctx.auth.
 */
export function auth(options: AuthOptions): Middleware {
  const { resolvers } = options

  return middleware((ctx, next) => {
    const cliName = ctx.meta.name

    const authContext = createAuthContext({
      cliName,
      prompts: ctx.prompts,
      resolveCredential: () => resolvePassive(cliName, resolvers),
      resolvers,
    })

    decorateContext(ctx, 'auth', authContext)

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to resolve a credential from passive (non-interactive) sources.
 *
 * Checks the file store first, then falls back to the environment variable.
 * Scans the resolver list for `env` and `file` source configs to respect
 * user-configured overrides (e.g. a custom `tokenVar` or `dirName`).
 *
 * @private
 * @param cliName - The CLI name, used to derive paths and env var names.
 * @param resolvers - The configured resolver list for extracting overrides.
 * @returns The resolved credential, or null.
 */
function resolvePassive(
  cliName: string,
  resolvers: readonly ResolverConfig[]
): AuthCredential | null {
  const fileConfig = findResolverBySource(resolvers, 'file')
  const envConfig = findResolverBySource(resolvers, 'env')

  const fromFile = resolveFromFile({
    dirName: resolveFileDir(fileConfig, cliName),
    filename: resolveFileFilename(fileConfig),
  })

  if (fromFile) {
    return fromFile
  }

  return resolveFromEnv({
    tokenVar: resolveEnvTokenVar(envConfig, cliName),
  })
}

/**
 * Find the first resolver config matching a given source type.
 *
 * @private
 * @param resolvers - The resolver config list.
 * @param source - The source type to find.
 * @returns The matching config, or undefined.
 */
function findResolverBySource<TSource extends ResolverConfig['source']>(
  resolvers: readonly ResolverConfig[],
  source: TSource
): Extract<ResolverConfig, { readonly source: TSource }> | undefined {
  return resolvers.find(
    (r): r is Extract<ResolverConfig, { readonly source: TSource }> => r.source === source
  )
}

/**
 * Resolve the file store directory name from a file resolver config.
 *
 * @private
 * @param config - The file resolver config, or undefined.
 * @param cliName - The CLI name for deriving the default.
 * @returns The directory name.
 */
function resolveFileDir(
  config: Extract<ResolverConfig, { readonly source: 'file' }> | undefined,
  cliName: string
): string {
  if (config !== undefined && config.dirName !== undefined) {
    return config.dirName
  }

  return `.${cliName}`
}

/**
 * Resolve the file store filename from a file resolver config.
 *
 * @private
 * @param config - The file resolver config, or undefined.
 * @returns The filename.
 */
function resolveFileFilename(
  config: Extract<ResolverConfig, { readonly source: 'file' }> | undefined
): string {
  if (config !== undefined && config.filename !== undefined) {
    return config.filename
  }

  return DEFAULT_AUTH_FILENAME
}

/**
 * Resolve the environment variable name from an env resolver config.
 *
 * @private
 * @param config - The env resolver config, or undefined.
 * @param cliName - The CLI name for deriving the default.
 * @returns The token variable name.
 */
function resolveEnvTokenVar(
  config: Extract<ResolverConfig, { readonly source: 'env' }> | undefined,
  cliName: string
): string {
  if (config !== undefined && config.tokenVar !== undefined) {
    return config.tokenVar
  }

  return deriveTokenVar(cliName)
}
