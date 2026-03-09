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
import { createAuthContext } from './create-auth-context.js'
import { resolveFromEnv } from './resolve-env.js'
import { resolveFromFile } from './resolve-file.js'
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
  PromptResolverOptions,
  PromptSourceConfig,
  ResolverConfig,
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
  readonly prompt: (options?: PromptResolverOptions) => PromptSourceConfig
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
 * command handler explicitly calls `ctx.auth.authenticate()`.
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
      resolveCredential: () => resolvePassive(cliName, resolvers),
      resolvers,
    })

    decorateContext(ctx, 'auth', authContext)

    if (options.http !== undefined) {
      const httpConfigs = normalizeHttpOptions(options.http)
      const credential = authContext.credential()
      const authHeaders = resolveCredentialHeaders(credential)

      httpConfigs.reduce((context, httpConfig) => {
        const client = createHttpClient({
          baseUrl: httpConfig.baseUrl,
          defaultHeaders: { ...authHeaders, ...httpConfig.headers },
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
  custom: buildCustom,
  deviceCode: buildDeviceCode,
  dotenv: buildDotenv,
  env: buildEnv,
  file: buildFile,
  oauth: buildOAuth,
  prompt: buildPrompt,
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
 * Build a prompt resolver config.
 *
 * @private
 * @param options - Optional prompt resolver options.
 * @returns A PromptSourceConfig with `source: 'prompt'`.
 */
function buildPrompt(options?: PromptResolverOptions): PromptSourceConfig {
  return { source: 'prompt' as const, ...options }
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
function resolveCredentialHeaders(
  credential: AuthCredential | null
): Readonly<Record<string, string>> {
  if (credential === null) {
    return {}
  }

  return buildAuthHeaders(credential)
}

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
