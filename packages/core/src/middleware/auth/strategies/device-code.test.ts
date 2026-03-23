import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'), () => ({
  execFile: vi.fn().mockReturnValue({ on: vi.fn() }),
}))

import type { Log } from '@/middleware/logger/types.js'

import { resolveFromDeviceCode } from './device-code.js'

const DEVICE_AUTH_URL = 'https://auth.example.com/device/code'
const TOKEN_URL = 'https://auth.example.com/token'
const CLIENT_ID = 'test-client'

const DEVICE_AUTH_RESPONSE = {
  device_code: 'dev-code-123',
  expires_in: 900,
  interval: 5,
  user_code: 'ABCD-1234',
  verification_uri: 'https://auth.example.com/activate',
}

function createMockLog(): Log {
  return {
    text: vi.fn().mockResolvedValue(''),
  } as unknown as Log
}

function createDefaultOptions(log: Log): {
  readonly clientId: string
  readonly deviceAuthUrl: string
  readonly tokenUrl: string
  readonly scopes: readonly string[]
  readonly pollInterval: number
  readonly timeout: number
  readonly log: Log
} {
  return {
    clientId: CLIENT_ID,
    deviceAuthUrl: DEVICE_AUTH_URL,
    log,
    pollInterval: 100,
    scopes: ['openid'],
    timeout: 60_000,
    tokenUrl: TOKEN_URL,
  }
}

describe('resolveFromDeviceCode()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('should return null when deviceAuthUrl uses HTTP', async () => {
    const log = createMockLog()

    const result = await resolveFromDeviceCode({
      ...createDefaultOptions(log),
      deviceAuthUrl: 'http://auth.example.com/device/code',
    })

    expect(result).toBeNull()
  })

  it('should return null when tokenUrl uses HTTP', async () => {
    const log = createMockLog()

    const result = await resolveFromDeviceCode({
      ...createDefaultOptions(log),
      tokenUrl: 'http://auth.example.com/token',
    })

    expect(result).toBeNull()
  })

  it('should return null when device auth request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))

    const log = createMockLog()
    const result = await resolveFromDeviceCode(createDefaultOptions(log))

    expect(result).toBeNull()
  })

  it('should return null when device auth returns error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: 'invalid_client' }, { status: 400 })
    )

    const log = createMockLog()
    const result = await resolveFromDeviceCode(createDefaultOptions(log))

    expect(result).toBeNull()
  })

  it('should display user code via log.text()', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    // First call: device auth
    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    // Second call: token (success immediately)
    fetchSpy.mockResolvedValueOnce(Response.json({ access_token: 'at-xyz' }, { status: 200 }))

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    // Advance past the poll interval
    await vi.advanceTimersByTimeAsync(5100)

    const result = await resultPromise

    expect(log.text).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('ABCD-1234'),
      })
    )
    expect(log.text).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('https://auth.example.com/activate'),
      })
    )
    expect(result).toEqual({ token: 'at-xyz', type: 'bearer' })
  })

  it('should return bearer credential on successful authorization', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    // First poll: pending
    fetchSpy.mockResolvedValueOnce(
      Response.json({ error: 'authorization_pending' }, { status: 400 })
    )

    // Second poll: success
    fetchSpy.mockResolvedValueOnce(Response.json({ access_token: 'final-token' }, { status: 200 }))

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    // First poll interval (server-provided: 5s * 1000 = 5000ms)
    await vi.advanceTimersByTimeAsync(5100)
    // Second poll interval
    await vi.advanceTimersByTimeAsync(5100)

    const result = await resultPromise

    expect(result).toEqual({ token: 'final-token', type: 'bearer' })
  })

  it('should return null when access is denied', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    fetchSpy.mockResolvedValueOnce(Response.json({ error: 'access_denied' }, { status: 400 }))

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    await vi.advanceTimersByTimeAsync(5100)

    const result = await resultPromise

    expect(result).toBeNull()
  })

  it('should return null when token expires', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    fetchSpy.mockResolvedValueOnce(Response.json({ error: 'expired_token' }, { status: 400 }))

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    await vi.advanceTimersByTimeAsync(5100)

    const result = await resultPromise

    expect(result).toBeNull()
  })

  it('should increase interval on slow_down response', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    // First poll: slow_down
    fetchSpy.mockResolvedValueOnce(Response.json({ error: 'slow_down' }, { status: 400 }))

    // Second poll: success (after increased interval)
    fetchSpy.mockResolvedValueOnce(Response.json({ access_token: 'slow-token' }, { status: 200 }))

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    // First poll at 5s
    await vi.advanceTimersByTimeAsync(5100)
    // After slow_down, interval increases by 5s (5s + 5s = 10s)
    await vi.advanceTimersByTimeAsync(10_100)

    const result = await resultPromise

    expect(result).toEqual({ token: 'slow-token', type: 'bearer' })
  })

  it('should continue polling on authorization_pending', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    // Three pending responses
    fetchSpy.mockResolvedValueOnce(
      Response.json({ error: 'authorization_pending' }, { status: 400 })
    )
    fetchSpy.mockResolvedValueOnce(
      Response.json({ error: 'authorization_pending' }, { status: 400 })
    )
    fetchSpy.mockResolvedValueOnce(
      Response.json({ access_token: 'pending-token' }, { status: 200 })
    )

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    await vi.advanceTimersByTimeAsync(5100)
    await vi.advanceTimersByTimeAsync(5100)
    await vi.advanceTimersByTimeAsync(5100)

    const result = await resultPromise

    expect(result).toEqual({ token: 'pending-token', type: 'bearer' })
  })

  it('should use correct grant_type in token request', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    fetchSpy.mockResolvedValueOnce(Response.json({ access_token: 'grant-token' }, { status: 200 }))

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    await vi.advanceTimersByTimeAsync(5100)

    await resultPromise

    // Second fetch call is the token request
    const [, tokenCall] = fetchSpy.mock.calls
    const tokenBody = tokenCall[1]?.body as string
    const params = new URLSearchParams(tokenBody)

    expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:device_code')
    expect(params.get('device_code')).toBe('dev-code-123')
    expect(params.get('client_id')).toBe(CLIENT_ID)
  })

  it('should return null when timeout is exceeded during polling', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    // Always return pending
    fetchSpy.mockResolvedValue(Response.json({ error: 'authorization_pending' }, { status: 400 }))

    const resultPromise = resolveFromDeviceCode({
      ...createDefaultOptions(log),
      timeout: 500,
    })

    // Advance past the timeout
    await vi.advanceTimersByTimeAsync(10_000)

    const result = await resultPromise

    expect(result).toBeNull()
  })

  it('should use configured poll interval when server does not provide one', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const responseWithoutInterval = {
      device_code: 'dev-code-456',
      expires_in: 900,
      user_code: 'EFGH-5678',
      verification_uri: 'https://auth.example.com/activate',
    }

    fetchSpy.mockResolvedValueOnce(Response.json(responseWithoutInterval, { status: 200 }))

    fetchSpy.mockResolvedValueOnce(
      Response.json({ access_token: 'config-interval-token' }, { status: 200 })
    )

    const resultPromise = resolveFromDeviceCode({
      ...createDefaultOptions(log),
      pollInterval: 200,
    })

    // Advance past the configured poll interval (200ms)
    await vi.advanceTimersByTimeAsync(250)

    const result = await resultPromise

    expect(result).toEqual({ token: 'config-interval-token', type: 'bearer' })
  })

  it('should include scopes in device auth request', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    fetchSpy.mockResolvedValueOnce(Response.json({ access_token: 'scoped-token' }, { status: 200 }))

    const resultPromise = resolveFromDeviceCode({
      ...createDefaultOptions(log),
      scopes: ['openid', 'profile', 'email'],
    })

    await vi.advanceTimersByTimeAsync(5100)

    await resultPromise

    // First fetch call is the device auth request
    const [authCall] = fetchSpy.mock.calls
    const authBody = authCall[1]?.body as string
    const params = new URLSearchParams(authBody)

    expect(params.get('scope')).toBe('openid profile email')
    expect(params.get('client_id')).toBe(CLIENT_ID)
  })

  it('should return null when device auth response is missing required fields', async () => {
    const log = createMockLog()
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ device_code: 'code' }, { status: 200 })
    )

    const result = await resolveFromDeviceCode(createDefaultOptions(log))

    expect(result).toBeNull()
  })

  it('should return null when token poll fetch fails with network error', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    // First call: device auth succeeds
    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    // Second call: token poll network error
    fetchSpy.mockRejectedValueOnce(new Error('network failure'))

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    await vi.advanceTimersByTimeAsync(5100)

    const result = await resultPromise

    expect(result).toBeNull()
  })

  it('should return null when token response body is malformed', async () => {
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    // Return non-JSON response body during polling
    fetchSpy.mockResolvedValueOnce(new Response('not-json-at-all', { status: 200 }))

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    await vi.advanceTimersByTimeAsync(5100)

    const result = await resultPromise

    expect(result).toBeNull()
  })

  it('should open browser with verification_uri', async () => {
    const { execFile: execFileMock } = await import('node:child_process')
    const log = createMockLog()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    fetchSpy.mockResolvedValueOnce(Response.json(DEVICE_AUTH_RESPONSE, { status: 200 }))

    fetchSpy.mockResolvedValueOnce(
      Response.json({ access_token: 'browser-token' }, { status: 200 })
    )

    const resultPromise = resolveFromDeviceCode(createDefaultOptions(log))

    await vi.advanceTimersByTimeAsync(5100)

    await resultPromise

    expect(vi.mocked(execFileMock)).toHaveBeenCalled()
    const { calls } = vi.mocked(execFileMock).mock
    const browserArgs = calls.flatMap((call) => call[1] as string[])
    expect(browserArgs).toContain('https://auth.example.com/activate')
  })
})
