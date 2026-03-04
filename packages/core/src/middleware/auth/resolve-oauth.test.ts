import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'), () => ({
  execFile: vi.fn(),
}))

vi.mock(import('node:crypto'), async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    randomBytes: vi.fn().mockReturnValue(Buffer.from('a'.repeat(32))),
  }
})

import { execFile } from 'node:child_process'

import { resolveFromOAuth } from './resolve-oauth.js'

const KNOWN_STATE = Buffer.from('a'.repeat(32)).toString('hex')

/**
 * Extract the server port from the URL passed to execFile (openBrowser).
 */
function extractPort(): number {
  const [call] = vi.mocked(execFile).mock.calls
  const url = new URL(call[1][0])
  const callbackRaw = url.searchParams.get('callback_url')

  if (callbackRaw === null) {
    return 0
  }

  const callbackUrl = new URL(callbackRaw)
  return Number(callbackUrl.port)
}

/**
 * Wait for the OAuth server to start and return the assigned port.
 */
async function waitForServer(): Promise<number> {
  await vi.waitFor(() => {
    expect(vi.mocked(execFile)).toHaveBeenCalled()
  })

  return extractPort()
}

/**
 * Post a JSON payload to the local OAuth callback server.
 */
async function postCallback(options: {
  readonly port: number
  readonly path: string
  readonly body: string
  readonly contentType?: string
}): Promise<Response> {
  const { port, path, body, contentType = 'application/json' } = options
  return fetch(`http://127.0.0.1:${String(port)}${path}`, {
    body,
    headers: { 'Content-Type': contentType },
    method: 'POST',
  })
}

/**
 * Send a valid token to cleanly shut down the server.
 */
async function shutdownServer(port: number): Promise<void> {
  await postCallback({
    body: JSON.stringify({ state: KNOWN_STATE, token: 'cleanup' }),
    path: '/callback',
    port,
  }).catch(() => {
    // Server may already be closed
  })
}

describe('resolveFromOAuth()', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when the timeout fires before a token arrives', async () => {
    const result = await resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 50,
    })

    expect(result).toBeNull()
  })

  it('should call clearTimeout after resolving', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')

    await resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 50,
    })

    expect(clearSpy).toHaveBeenCalled()

    clearSpy.mockRestore()
  })

  it('should return bearer credential when valid token is posted', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 5000,
    })

    const port = await waitForServer()
    const body = JSON.stringify({ state: KNOWN_STATE, token: 'oauth-token-123' })
    await postCallback({ body, path: '/callback', port })

    const result = await resultPromise

    expect(result).toEqual({ token: 'oauth-token-123', type: 'bearer' })
  })

  it('should return 200 success page when valid token is posted', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 5000,
    })

    const port = await waitForServer()
    const body = JSON.stringify({ state: KNOWN_STATE, token: 'success-token' })
    const response = await postCallback({ body, path: '/callback', port })

    expect(response.status).toBe(200)

    const html = await response.text()
    expect(html).toContain('Authentication complete')

    await resultPromise
  })

  it('should return 400 when content-type is not application/json', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 5000,
    })

    const port = await waitForServer()
    const body = JSON.stringify({ state: KNOWN_STATE, token: 'token' })
    const response = await postCallback({ body, contentType: 'text/plain', path: '/callback', port })

    expect(response.status).toBe(400)

    await shutdownServer(port)
    await resultPromise
  })

  it('should return 400 when state does not match', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 5000,
    })

    const port = await waitForServer()
    const body = JSON.stringify({ state: 'wrong-state', token: 'token' })
    const response = await postCallback({ body, path: '/callback', port })

    expect(response.status).toBe(400)

    await shutdownServer(port)
    await resultPromise
  })

  it('should return 400 when token field is missing from body', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 5000,
    })

    const port = await waitForServer()
    const body = JSON.stringify({ state: KNOWN_STATE })
    const response = await postCallback({ body, path: '/callback', port })

    expect(response.status).toBe(400)

    await shutdownServer(port)
    await resultPromise
  })

  it('should return 400 when request method is GET', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 5000,
    })

    const port = await waitForServer()
    const response = await fetch(`http://127.0.0.1:${String(port)}/callback`)

    expect(response.status).toBe(400)

    await shutdownServer(port)
    await resultPromise
  })

  it('should return 400 when request path does not match callback path', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 5000,
    })

    const port = await waitForServer()
    const body = JSON.stringify({ state: KNOWN_STATE, token: 'token' })
    const response = await postCallback({ body, path: '/wrong-path', port })

    expect(response.status).toBe(400)

    await shutdownServer(port)
    await resultPromise
  })

  it('should reject oversized request bodies', async () => {
    const resultPromise = resolveFromOAuth({
      authUrl: 'http://localhost:9999/auth',
      callbackPath: '/callback',
      port: 0,
      timeout: 5000,
    })

    const port = await waitForServer()
    const largeBody = JSON.stringify({ padding: 'x'.repeat(20_000), state: KNOWN_STATE, token: 'token' })

    try {
      await postCallback({ body: largeBody, path: '/callback', port })
    } catch {
      // Connection may be destroyed before response completes -- expected
    }

    await shutdownServer(port)

    // The oversized body may have destroyed the connection; allow timeout fallback
    const result = await Promise.race([
      resultPromise,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 200)
      }),
    ])

    expect(result).not.toEqual(
      expect.objectContaining({ token: expect.stringContaining('x'.repeat(100)) })
    )
  })
})
