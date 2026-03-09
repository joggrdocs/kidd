/**
 * Auth credential and resolver types for the auth middleware.
 *
 * Defines discriminated unions for credential formats and resolver
 * configurations, the {@link AuthContext} exposed on `ctx.auth`,
 * and the top-level {@link AuthOptions} interface.
 *
 * @module
 */

import type { AsyncResult } from '@kidd-cli/utils/fp'

// ---------------------------------------------------------------------------
// Auth credentials
// ---------------------------------------------------------------------------

/**
 * Bearer token credential — sends `Authorization: Bearer <token>`.
 */
export interface BearerCredential {
  readonly type: 'bearer'
  readonly token: string
}

/**
 * Basic auth credential — sends `Authorization: Basic base64(user:pass)`.
 */
export interface BasicCredential {
  readonly type: 'basic'
  readonly username: string
  readonly password: string
}

/**
 * API key credential — sends the key in a custom header.
 */
export interface ApiKeyCredential {
  readonly type: 'api-key'
  readonly headerName: string
  readonly key: string
}

/**
 * Custom credential — sends arbitrary headers.
 */
export interface CustomCredential {
  readonly type: 'custom'
  readonly headers: Readonly<Record<string, string>>
}

/**
 * Discriminated union of all supported auth credential formats.
 * The `type` field acts as the discriminator.
 */
export type AuthCredential =
  | BearerCredential
  | BasicCredential
  | ApiKeyCredential
  | CustomCredential

// ---------------------------------------------------------------------------
// Resolver configs
// ---------------------------------------------------------------------------

/**
 * Resolve credentials from environment variables.
 */
export interface EnvSourceConfig {
  readonly source: 'env'
  readonly tokenVar?: string
}

/**
 * Resolve credentials from a `.env` file parsed with dotenv.
 */
export interface DotenvSourceConfig {
  readonly source: 'dotenv'
  readonly tokenVar?: string
  readonly path?: string
}

/**
 * Resolve credentials from a JSON file on disk.
 */
export interface FileSourceConfig {
  readonly source: 'file'
  readonly filename?: string
  readonly dirName?: string
}

/**
 * Resolve credentials via OAuth 2.0 Authorization Code + PKCE (RFC 7636 + RFC 8252).
 *
 * Opens the user's browser to the authorization URL, receives an auth code
 * via GET redirect to a local server, and exchanges it at the token endpoint
 * with a PKCE code verifier.
 */
export interface OAuthSourceConfig {
  readonly source: 'oauth'
  readonly clientId: string
  readonly authUrl: string
  readonly tokenUrl: string
  readonly scopes?: readonly string[]
  readonly port?: number
  readonly callbackPath?: string
  readonly timeout?: number
}

/**
 * Resolve credentials via OAuth 2.0 Device Authorization Grant (RFC 8628).
 *
 * Requests a device code from the authorization server, displays a
 * verification URL and user code, and polls the token endpoint until
 * the user completes authorization.
 */
export interface DeviceCodeSourceConfig {
  readonly source: 'device-code'
  readonly clientId: string
  readonly deviceAuthUrl: string
  readonly tokenUrl: string
  readonly scopes?: readonly string[]
  readonly pollInterval?: number
  readonly timeout?: number
}

/**
 * Resolve credentials by prompting the user interactively.
 */
export interface TokenSourceConfig {
  readonly source: 'token'
  readonly message?: string
}

/**
 * Resolve credentials via a user-supplied function.
 */
export interface CustomSourceConfig {
  readonly source: 'custom'
  readonly resolver: () => Promise<AuthCredential | null> | AuthCredential | null
}

/**
 * Discriminated union of all supported credential source configurations.
 * The `source` field acts as the discriminator.
 */
export type ResolverConfig =
  | EnvSourceConfig
  | DotenvSourceConfig
  | FileSourceConfig
  | OAuthSourceConfig
  | DeviceCodeSourceConfig
  | TokenSourceConfig
  | CustomSourceConfig

// ---------------------------------------------------------------------------
// Login error
// ---------------------------------------------------------------------------

/**
 * Error returned by {@link AuthContext.authenticate} when interactive auth fails.
 */
export interface LoginError {
  readonly type: 'no_credential' | 'save_failed'
  readonly message: string
}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

/**
 * Auth context decorated onto `ctx.auth` by the auth middleware.
 *
 * No credential data is stored directly on the context. Instead, callers
 * use `credential()` to read saved credentials on demand and
 * `authenticated()` to check whether a credential exists without exposing it.
 *
 * `authenticate()` runs the configured interactive resolvers (OAuth, prompt,
 * etc.), persists the resulting credential to disk, and returns a
 * {@link AsyncResult}.
 */
export interface AuthContext {
  readonly credential: () => AuthCredential | null
  readonly authenticated: () => boolean
  readonly authenticate: () => AsyncResult<AuthCredential, LoginError>
}

// ---------------------------------------------------------------------------
// Auth options
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Resolver builder option types
// ---------------------------------------------------------------------------

/**
 * Options for the `auth.env()` builder. Omits the `source` discriminator.
 */
export type EnvResolverOptions = Omit<EnvSourceConfig, 'source'>

/**
 * Options for the `auth.dotenv()` builder. Omits the `source` discriminator.
 */
export type DotenvResolverOptions = Omit<DotenvSourceConfig, 'source'>

/**
 * Options for the `auth.file()` builder. Omits the `source` discriminator.
 */
export type FileResolverOptions = Omit<FileSourceConfig, 'source'>

/**
 * Options for the `auth.oauth()` builder. Omits the `source` discriminator.
 */
export type OAuthResolverOptions = Omit<OAuthSourceConfig, 'source'>

/**
 * Options for the `auth.deviceCode()` builder. Omits the `source` discriminator.
 */
export type DeviceCodeResolverOptions = Omit<DeviceCodeSourceConfig, 'source'>

/**
 * Options for the `auth.token()` builder. Omits the `source` discriminator.
 */
export type TokenResolverOptions = Omit<TokenSourceConfig, 'source'>

/**
 * Function signature accepted by `auth.custom()`.
 */
export type CustomResolverFn = () => Promise<AuthCredential | null> | AuthCredential | null

// ---------------------------------------------------------------------------
// Auth HTTP integration
// ---------------------------------------------------------------------------

/**
 * Configuration for an HTTP client created by the auth middleware.
 *
 * When provided on {@link AuthOptions}, the auth middleware creates an HTTP
 * client with automatic credential header injection and decorates it onto
 * `ctx[namespace]`.
 */
export interface AuthHttpOptions {
  readonly baseUrl: string
  readonly namespace: string
  readonly headers?: Readonly<Record<string, string>>
}

// ---------------------------------------------------------------------------
// Auth options
// ---------------------------------------------------------------------------

/**
 * Options accepted by the `auth()` middleware factory.
 *
 * @property resolvers - Ordered list of credential sources to try via `authenticate()`.
 * @property http - Optional HTTP client(s) with automatic credential injection.
 */
export interface AuthOptions {
  readonly resolvers: readonly ResolverConfig[]
  readonly http?: AuthHttpOptions | readonly AuthHttpOptions[]
}

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------

/**
 * Augments the base {@link Context} with an optional `auth` property.
 *
 * When a consumer imports `kidd/auth`, this declaration merges `auth`
 * onto `Context` so that `ctx.auth` is typed without manual casting.
 */
declare module '@kidd-cli/core' {
  interface Context {
    readonly auth: AuthContext
  }
}
