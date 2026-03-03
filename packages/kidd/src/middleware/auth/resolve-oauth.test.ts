import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveFromOAuth } from './resolve-oauth.js'

vi.mock(import('node:child_process'), () => ({
  execFile: vi.fn(),
}))

describe('resolveFromOAuth()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
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
  })
})
