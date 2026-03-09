/**
 * OAuth 2.0 Device Authorization Grant resolver (RFC 8628).
 *
 * Requests a device code, displays the verification URL and user code,
 * and polls the token endpoint until the user completes authorization
 * or the flow times out.
 *
 * @module
 */

import { match } from 'ts-pattern'

import type { Prompts } from '@/context/types.js'

import { openBrowser } from './oauth-shared.js'
import type { AuthCredential } from './types.js'

/**
 * RFC 8628 slow_down backoff increment in milliseconds.
 */
const SLOW_DOWN_INCREMENT = 5000

/**
 * RFC 8628 device code grant type URN.
 */
const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'

/**
 * Resolve a bearer credential via OAuth 2.0 Device Authorization Grant.
 *
 * 1. POSTs to the device authorization endpoint to obtain a device code
 * 2. Displays the verification URL and user code via prompts
 * 3. Optionally opens the verification URL in the browser
 * 4. Polls the token endpoint until authorization completes or times out
 *
 * @param options - Device code flow configuration.
 * @returns A bearer credential on success, null on failure or timeout.
 */
export async function resolveFromDeviceCode(options: {
  readonly clientId: string
  readonly deviceAuthUrl: string
  readonly tokenUrl: string
  readonly scopes: readonly string[]
  readonly pollInterval: number
  readonly timeout: number
  readonly prompts: Prompts
}): Promise<AuthCredential | null> {
  const authResponse = await requestDeviceAuth({
    clientId: options.clientId,
    deviceAuthUrl: options.deviceAuthUrl,
    scopes: options.scopes,
  })

  if (!authResponse) {
    return null
  }

  await displayUserCode(options.prompts, authResponse.verificationUri, authResponse.userCode)
  openBrowser(authResponse.verificationUri)

  const interval = resolveInterval(authResponse.interval, options.pollInterval)
  const deadline = Date.now() + options.timeout

  return pollForToken({
    clientId: options.clientId,
    deadline,
    deviceCode: authResponse.deviceCode,
    interval,
    tokenUrl: options.tokenUrl,
  })
}

// ---------------------------------------------------------------------------
// Private types
// ---------------------------------------------------------------------------

/**
 * Parsed response from the device authorization endpoint.
 *
 * @private
 */
interface DeviceAuthResponse {
  readonly deviceCode: string
  readonly userCode: string
  readonly verificationUri: string
  readonly interval: number | null
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Request a device code from the authorization server.
 *
 * @private
 * @param options - Device auth request parameters.
 * @returns The parsed device auth response, or null on failure.
 */
async function requestDeviceAuth(options: {
  readonly clientId: string
  readonly deviceAuthUrl: string
  readonly scopes: readonly string[]
}): Promise<DeviceAuthResponse | null> {
  try {
    const body = new URLSearchParams({ client_id: options.clientId })

    if (options.scopes.length > 0) {
      body.set('scope', options.scopes.join(' '))
    }

    const response = await fetch(options.deviceAuthUrl, {
      body: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    })

    if (!response.ok) {
      return null
    }

    const data: unknown = await response.json()

    return parseDeviceAuthResponse(data)
  } catch {
    return null
  }
}

/**
 * Parse a device authorization response body.
 *
 * @private
 * @param data - The raw response data.
 * @returns The parsed response, or null if required fields are missing.
 */
function parseDeviceAuthResponse(data: unknown): DeviceAuthResponse | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const record = data as Record<string, unknown>

  if (typeof record.device_code !== 'string' || record.device_code === '') {
    return null
  }

  if (typeof record.user_code !== 'string' || record.user_code === '') {
    return null
  }

  if (typeof record.verification_uri !== 'string' || record.verification_uri === '') {
    return null
  }

  const interval = resolveServerInterval(record.interval)

  return {
    deviceCode: record.device_code,
    interval,
    userCode: record.user_code,
    verificationUri: record.verification_uri,
  }
}

/**
 * Display the verification URL and user code to the user.
 *
 * Uses `prompts.text()` to show the information and wait for
 * the user to press Enter to acknowledge.
 *
 * @private
 * @param prompts - The prompts instance.
 * @param verificationUri - The URL the user should visit.
 * @param userCode - The code the user should enter.
 */
async function displayUserCode(
  prompts: Prompts,
  verificationUri: string,
  userCode: string
): Promise<void> {
  try {
    await prompts.text({
      defaultValue: '',
      message: `Open ${verificationUri} and enter code: ${userCode} (press Enter to continue)`,
    })
  } catch {
    // User cancelled -- continue anyway, polling will handle timeout
  }
}

/**
 * Resolve the poll interval, preferring server-provided value.
 *
 * @private
 * @param serverInterval - The interval from the server response (in ms), or null.
 * @param configInterval - The configured default interval.
 * @returns The resolved interval in milliseconds.
 */
function resolveInterval(serverInterval: number | null, configInterval: number): number {
  if (serverInterval !== null) {
    return serverInterval
  }

  return configInterval
}

/**
 * Poll the token endpoint for an access token using recursive tail-call style.
 *
 * Handles RFC 8628 error codes:
 * - `authorization_pending` -- continue polling
 * - `slow_down` -- increase interval by 5 seconds, continue
 * - `expired_token` -- return null
 * - `access_denied` -- return null
 *
 * @private
 * @param options - Polling parameters.
 * @returns A bearer credential on success, null on failure or timeout.
 */
async function pollForToken(options: {
  readonly tokenUrl: string
  readonly deviceCode: string
  readonly clientId: string
  readonly interval: number
  readonly deadline: number
}): Promise<AuthCredential | null> {
  if (Date.now() >= options.deadline) {
    return null
  }

  await sleep(options.interval)

  if (Date.now() >= options.deadline) {
    return null
  }

  const result = await requestToken({
    clientId: options.clientId,
    deviceCode: options.deviceCode,
    tokenUrl: options.tokenUrl,
  })

  return match(result)
    .with({ status: 'success' }, (r) => r.credential)
    .with({ status: 'pending' }, () => pollForToken(options))
    .with({ status: 'slow_down' }, () =>
      pollForToken({
        ...options,
        interval: options.interval + SLOW_DOWN_INCREMENT,
      })
    )
    .with({ status: 'denied' }, () => null)
    .with({ status: 'expired' }, () => null)
    .with({ status: 'error' }, () => null)
    .exhaustive()
}

/**
 * Convert a server-provided interval value to milliseconds.
 *
 * @private
 * @param value - The raw interval value from the server response.
 * @returns The interval in milliseconds, or null if not a number.
 */
function resolveServerInterval(value: unknown): number | null {
  if (typeof value === 'number') {
    return value * 1000
  }

  return null
}

/**
 * Sleep for a given duration.
 *
 * @private
 * @param ms - Duration in milliseconds.
 * @returns A promise that resolves after the delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// ---------------------------------------------------------------------------
// Token request types and helpers
// ---------------------------------------------------------------------------

/**
 * Discriminated union of token request outcomes.
 *
 * @private
 */
type TokenRequestResult =
  | { readonly status: 'success'; readonly credential: AuthCredential }
  | { readonly status: 'pending' }
  | { readonly status: 'slow_down' }
  | { readonly status: 'denied' }
  | { readonly status: 'expired' }
  | { readonly status: 'error' }

/**
 * Request an access token from the token endpoint.
 *
 * @private
 * @param options - Token request parameters.
 * @returns A discriminated result indicating the outcome.
 */
async function requestToken(options: {
  readonly tokenUrl: string
  readonly deviceCode: string
  readonly clientId: string
}): Promise<TokenRequestResult> {
  try {
    const body = new URLSearchParams({
      client_id: options.clientId,
      device_code: options.deviceCode,
      grant_type: DEVICE_CODE_GRANT_TYPE,
    })

    const response = await fetch(options.tokenUrl, {
      body: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    })

    const data: unknown = await response.json()

    if (typeof data !== 'object' || data === null) {
      return { status: 'error' }
    }

    const record = data as Record<string, unknown>

    if (response.ok && typeof record.access_token === 'string' && record.access_token !== '') {
      return { credential: { token: record.access_token, type: 'bearer' }, status: 'success' }
    }

    if (typeof record.error !== 'string') {
      return { status: 'error' }
    }

    return match(record.error)
      .with('authorization_pending', (): TokenRequestResult => ({ status: 'pending' }))
      .with('slow_down', (): TokenRequestResult => ({ status: 'slow_down' }))
      .with('expired_token', (): TokenRequestResult => ({ status: 'expired' }))
      .with('access_denied', (): TokenRequestResult => ({ status: 'denied' }))
      .otherwise((): TokenRequestResult => ({ status: 'error' }))
  } catch {
    return { status: 'error' }
  }
}
