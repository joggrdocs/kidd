/**
 * Auth middleware factory with resolver builder functions.
 *
 * Decorates `ctx.auth` with functions to resolve credentials on demand
 * and run interactive authentication. Also supports creating authenticated
 * HTTP clients via the `http` option.
 *
 * @module
 */

import { decorateContext } from '@/context/decorate.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types.js'

import { buildAuthHeaders } from '../http/build-auth-headers.js'
import { createHttpClient } from '../http/create-http-client.js'
import { DEFAULT_AUTH_FILENAME, deriveTokenVar } from './constants.js'
import { createAuthContext } from './context.js'
import { resolveFromEnv } from './strategies/env.js'
import { resolveFromFile } from './strategies/file.js'
import type {
  AuthCredential,
  AuthHttpOptions,
  AuthOptions,
  CustomResolverFn,
  CustomSourceConfig,
  DeviceCodeResolverOptions,
  DeviceCodeSourceConfig,
  DotenvResolverOptions,
  DotenvSourceConfig,
  EnvResolverOptions,
  EnvSourceConfig,
  FileResolverOptions,
  FileSourceConfig,
  OAuthResolverOptions,
  OAuthSourceConfig,
  ResolverConfig,
  TokenResolverOptions,
  TokenSourceConfig,
} from './types.js'

/**
 * Auth factory interface — callable as a middleware factory and as a
 * namespace for resolver builder functions.
 */
export interface AuthFactory {
  (options: AuthOptions): Middleware
  readonly env: (options?: EnvResolverOptions) => EnvSourceConfig
  readonly dotenv: (options?: DotenvResolverOptions) => DotenvSourceConfig
  readonly file: (options?: FileResolverOptions) => FileSourceConfig
  readonly oauth: (options: OAuthResolverOptions) => OAuthSourceConfig
  readonly deviceCode: (options: DeviceCodeResolverOptions) => DeviceCodeSourceConfig
  readonly token: (options?: TokenResolverOptions) => TokenSourceConfig
  readonly apiKey: (options?: TokenResolverOptions) => TokenSourceConfig
  readonly custom: (resolver: CustomResolverFn) => CustomSourceConfig
}

/**
 * Create an auth middleware that decorates `ctx.auth`.
 *
 * No credential data is stored on the context. `ctx.auth.credential()`
 * resolves passively from two sources on every call:
 * 1. File — `~/.cli-name/auth.json`
 * 2. Env — `CLI_NAME_TOKEN`
 *
 * Interactive resolvers (OAuth, prompt, custom) only run when the
 * command handler explicitly calls `ctx.auth.login()`.
 *
 * When `options.http` is provided, the middleware also creates HTTP
 * client(s) with automatic credential header injection and decorates
 * them onto `ctx[namespace]`.
 *
 * @param options - Auth middleware configuration.
 * @returns A Middleware that decorates ctx.auth (and optionally HTTP clients).
 */
function createAuth(options: AuthOptions): Middleware {
  const { resolvers } = options

  return middleware((ctx, next) => {
    const cliName = ctx.meta.name

    const authContext = createAuthContext({
      cliName,
      prompts: ctx.prompts,
      resolveCredential: () => resolveStoredCredential(cliName, resolvers),
      resolvers,
    })

    decorateContext(ctx, 'auth', authContext)

    if (options.http !== undefined) {
      const httpConfigs = normalizeHttpOptions(options.http)

      httpConfigs.reduce((context, httpConfig) => {
        const client = createHttpClient({
          baseUrl: httpConfig.baseUrl,
          defaultHeaders: httpConfig.headers,
          resolveHeaders: () => credentialToHeaders(authContext.credential()),
        })

        return decorateContext(context, httpConfig.namespace, client)
      }, ctx)
    }

    return next()
  })
}

/**
 * Auth middleware factory with resolver builder methods.
 *
 * Use as `auth({ resolvers: [...] })` to create middleware, or use
 * the builder methods (`auth.env()`, `auth.oauth()`, etc.) to construct
 * resolver configs with a cleaner API.
 */
export const auth: AuthFactory = Object.assign(createAuth, {
  apiKey: buildToken,
  custom: buildCustom,
  deviceCode: buildDeviceCode,
  dotenv: buildDotenv,
  env: buildEnv,
  file: buildFile,
  oauth: buildOAuth,
  token: buildToken,
})

// ---------------------------------------------------------------------------
// Resolver builders
// ---------------------------------------------------------------------------

/**
 * Build an env resolver config.
 *
 * @private
 * @param options - Optional env resolver options.
 * @returns An EnvSourceConfig with `source: 'env'`.
 */
function buildEnv(options?: EnvResolverOptions): EnvSourceConfig {
  return { source: 'env' as const, ...options }
}

/**
 * Build a dotenv resolver config.
 *
 * @private
 * @param options - Optional dotenv resolver options.
 * @returns A DotenvSourceConfig with `source: 'dotenv'`.
 */
function buildDotenv(options?: DotenvResolverOptions): DotenvSourceConfig {
  return { source: 'dotenv' as const, ...options }
}

/**
 * Build a file resolver config.
 *
 * @private
 * @param options - Optional file resolver options.
 * @returns A FileSourceConfig with `source: 'file'`.
 */
function buildFile(options?: FileResolverOptions): FileSourceConfig {
  return { source: 'file' as const, ...options }
}

/**
 * Build an OAuth resolver config.
 *
 * @private
 * @param options - OAuth resolver options (clientId, authUrl, tokenUrl required).
 * @returns An OAuthSourceConfig with `source: 'oauth'`.
 */
function buildOAuth(options: OAuthResolverOptions): OAuthSourceConfig {
  return { source: 'oauth' as const, ...options }
}

/**
 * Build a device code resolver config.
 *
 * @private
 * @param options - Device code resolver options (clientId, deviceAuthUrl, tokenUrl required).
 * @returns A DeviceCodeSourceConfig with `source: 'device-code'`.
 */
function buildDeviceCode(options: DeviceCodeResolverOptions): DeviceCodeSourceConfig {
  return { source: 'device-code' as const, ...options }
}

/**
 * Build a token resolver config.
 *
 * Prompts the user for a token interactively. Aliased as `auth.apiKey()`.
 *
 * @private
 * @param options - Optional token resolver options.
 * @returns A TokenSourceConfig with `source: 'token'`.
 */
function buildToken(options?: TokenResolverOptions): TokenSourceConfig {
  return { source: 'token' as const, ...options }
}

/**
 * Build a custom resolver config from a resolver function.
 *
 * @private
 * @param resolver - The custom resolver function.
 * @returns A CustomSourceConfig with `source: 'custom'`.
 */
function buildCustom(resolver: CustomResolverFn): CustomSourceConfig {
  return { resolver, source: 'custom' as const }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Normalize the `http` option into an array of configs.
 *
 * @private
 * @param http - A single config or array of configs.
 * @returns An array of AuthHttpOptions.
 */
function normalizeHttpOptions(
  http: AuthHttpOptions | readonly AuthHttpOptions[]
): readonly AuthHttpOptions[] {
  if ('baseUrl' in http) {
    return [http]
  }

  return http
}

/**
 * Convert a credential into auth headers, returning an empty record
 * when no credential is available.
 *
 * @private
 * @param credential - The credential or null.
 * @returns A record of auth headers.
 */
function credentialToHeaders(
  credential: AuthCredential | null
): Readonly<Record<string, string>> {
  if (credential === null) {
    return {}
  }

  return buildAuthHeaders(credential)
}

/**
 * Extract a property from an optional config object, falling back to a default.
 *
 * @private
 * @param config - The config object, or undefined.
 * @param key - The property key to extract.
 * @param fallback - The default value when the config or property is undefined.
 * @returns The config property value or the fallback.
 */
function configPropOrDefault<TConfig extends object, TKey extends keyof TConfig>(
  config: TConfig | undefined,
  key: TKey,
  fallback: NonNullable<TConfig[TKey]>
): NonNullable<TConfig[TKey]> {
  if (config !== undefined && config[key] !== undefined) {
    return config[key] as NonNullable<TConfig[TKey]>
  }

  return fallback
}

/**
 * Attempt to resolve a credential from stored (non-interactive) sources.
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
function resolveStoredCredential(
  cliName: string,
  resolvers: readonly ResolverConfig[]
): AuthCredential | null {
  const fileConfig = findResolverBySource(resolvers, 'file')
  const envConfig = findResolverBySource(resolvers, 'env')

  const fromFile = resolveFromFile({
    dirName: configPropOrDefault(fileConfig, 'dirName', `.${cliName}`),
    filename: configPropOrDefault(fileConfig, 'filename', DEFAULT_AUTH_FILENAME),
  })

  if (fromFile) {
    return fromFile
  }

  return resolveFromEnv({
    tokenVar: configPropOrDefault(envConfig, 'tokenVar', deriveTokenVar(cliName)),
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
