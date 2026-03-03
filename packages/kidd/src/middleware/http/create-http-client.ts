/**
 * Typed HTTP client factory.
 *
 * Creates a closure-based {@link HttpClient} with pre-configured base URL,
 * auth credentials, and default headers. All methods delegate to a shared
 * request executor.
 *
 * @module
 */

import { attemptAsync } from '@kidd/utils/fp'

import type { AuthCredential } from '../auth/types.js'
import { buildAuthHeaders } from './build-auth-headers.js'
import type { HttpClient, RequestOptions, TypedResponse } from './types.js'

/**
 * Options for creating an HTTP client.
 */
interface CreateHttpClientOptions {
  readonly baseUrl: string
  readonly credential?: AuthCredential
  readonly defaultHeaders?: Readonly<Record<string, string>>
}

/**
 * Create a typed HTTP client with pre-configured base URL, auth, and headers.
 *
 * @param options - Client configuration.
 * @returns An HttpClient instance.
 */
export function createHttpClient(options: CreateHttpClientOptions): HttpClient {
  const { baseUrl, credential, defaultHeaders } = options

  return {
    delete: <TResponse = unknown>(path: string, requestOptions?: RequestOptions) =>
      executeRequest<TResponse>(
        baseUrl,
        'DELETE',
        path,
        credential,
        defaultHeaders,
        requestOptions
      ),

    get: <TResponse = unknown>(path: string, requestOptions?: RequestOptions) =>
      executeRequest<TResponse>(baseUrl, 'GET', path, credential, defaultHeaders, requestOptions),

    patch: <TResponse = unknown, TBody = unknown>(
      path: string,
      requestOptions?: RequestOptions<TBody>
    ) =>
      executeRequest<TResponse>(baseUrl, 'PATCH', path, credential, defaultHeaders, requestOptions),

    post: <TResponse = unknown, TBody = unknown>(
      path: string,
      requestOptions?: RequestOptions<TBody>
    ) =>
      executeRequest<TResponse>(baseUrl, 'POST', path, credential, defaultHeaders, requestOptions),

    put: <TResponse = unknown, TBody = unknown>(
      path: string,
      requestOptions?: RequestOptions<TBody>
    ) =>
      executeRequest<TResponse>(baseUrl, 'PUT', path, credential, defaultHeaders, requestOptions),
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Build the full URL from base, path, and optional query params.
 *
 * @private
 * @param baseUrl - The base URL.
 * @param path - The request path.
 * @param params - Optional query parameters.
 * @returns The fully qualified URL string.
 */
function buildUrl(
  baseUrl: string,
  path: string,
  params: Readonly<Record<string, string>> | undefined
): string {
  const url = new URL(path, baseUrl)

  if (params !== undefined) {
    const searchParams = new URLSearchParams(params)
    url.search = searchParams.toString()
  }

  return url.toString()
}

/**
 * Resolve auth headers from a credential, returning an empty record
 * when no credential is provided.
 *
 * @private
 * @param credential - Optional auth credential.
 * @returns A record of auth headers.
 */
function resolveAuthHeaders(
  credential: AuthCredential | undefined
): Readonly<Record<string, string>> {
  if (credential !== undefined) {
    return buildAuthHeaders(credential)
  }

  return {}
}

/**
 * Merge auth, default, and per-request headers into a single record.
 *
 * Per-request headers take highest priority, then default headers,
 * then auth headers.
 *
 * @private
 * @param credential - Optional auth credential.
 * @param defaultHeaders - Optional default headers.
 * @param requestHeaders - Optional per-request headers.
 * @returns The merged headers record.
 */
function mergeHeaders(
  credential: AuthCredential | undefined,
  defaultHeaders: Readonly<Record<string, string>> | undefined,
  requestHeaders: Readonly<Record<string, string>> | undefined
): Readonly<Record<string, string>> {
  const authHeaders = resolveAuthHeaders(credential)

  return {
    ...authHeaders,
    ...defaultHeaders,
    ...requestHeaders,
  }
}

/**
 * Extract the params field from request options if present.
 *
 * @private
 * @param options - Optional per-request options.
 * @returns The params record or undefined.
 */
function extractParams(
  options: RequestOptions | undefined
): Readonly<Record<string, string>> | undefined {
  if (options !== undefined) {
    return options.params
  }

  return undefined
}

/**
 * Extract the headers field from request options if present.
 *
 * @private
 * @param options - Optional per-request options.
 * @returns The headers record or undefined.
 */
function extractHeaders(
  options: RequestOptions | undefined
): Readonly<Record<string, string>> | undefined {
  if (options !== undefined) {
    return options.headers
  }

  return undefined
}

/**
 * Extract the signal field from request options if present.
 *
 * @private
 * @param options - Optional per-request options.
 * @returns The AbortSignal or undefined.
 */
function extractSignal(options: RequestOptions | undefined): AbortSignal | undefined {
  if (options !== undefined) {
    return options.signal
  }

  return undefined
}

/**
 * Resolve the serialized body string and content-type header mutation.
 *
 * @private
 * @param options - Optional per-request options.
 * @returns The serialized body string or undefined.
 */
function resolveBody(options: RequestOptions | undefined): string | undefined {
  if (options !== undefined && options.body !== undefined) {
    return JSON.stringify(options.body)
  }

  return undefined
}

/**
 * Build the fetch init options from resolved values.
 *
 * @private
 * @param method - The HTTP method.
 * @param headers - The merged headers.
 * @param body - The serialized body or undefined.
 * @param signal - The abort signal or undefined.
 * @returns The RequestInit for fetch.
 */
function buildFetchInit(
  method: string,
  headers: Readonly<Record<string, string>>,
  body: string | undefined,
  signal: AbortSignal | undefined
): RequestInit {
  if (body !== undefined) {
    return {
      body,
      headers: { ...headers, 'Content-Type': 'application/json' },
      method,
      signal,
    }
  }

  return {
    headers,
    method,
    signal,
  }
}

/**
 * Execute an HTTP request and wrap the response.
 *
 * @private
 * @param baseUrl - The base URL.
 * @param method - The HTTP method.
 * @param path - The request path.
 * @param credential - Optional auth credential.
 * @param defaultHeaders - Optional default headers.
 * @param options - Optional per-request options.
 * @returns A typed response wrapper.
 */
async function executeRequest<TResponse>(
  baseUrl: string,
  method: string,
  path: string,
  credential: AuthCredential | undefined,
  defaultHeaders: Readonly<Record<string, string>> | undefined,
  options: RequestOptions | undefined
): Promise<TypedResponse<TResponse>> {
  const url = buildUrl(baseUrl, path, extractParams(options))
  const headers = mergeHeaders(credential, defaultHeaders, extractHeaders(options))
  const body = resolveBody(options)
  const signal = extractSignal(options)
  const init = buildFetchInit(method, headers, body, signal)

  const response = await fetch(url, init)
  const data = await parseResponseBody<TResponse>(response)

  return {
    data,
    headers: response.headers,
    ok: response.ok,
    raw: response,
    status: response.status,
  }
}

/**
 * Parse the response body as JSON, returning null on failure.
 *
 * Wraps `response.json()` with `attemptAsync` so malformed API
 * responses do not crash the command. Returns `null as TResponse`
 * when parsing fails.
 *
 * @private
 * @param response - The fetch Response.
 * @returns The parsed body or null.
 */
async function parseResponseBody<TResponse>(response: Response): Promise<TResponse> {
  const [error, data] = await attemptAsync(() => response.json() as Promise<TResponse>)

  if (error) {
    return null as TResponse
  }

  return data as TResponse
}
