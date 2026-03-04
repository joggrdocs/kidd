import { describe, expect, it, vi } from 'vitest'

import { hasTag } from '@kidd-cli/utils/tag'

import { http } from './http.js'

function createMockCtx(options: { readonly credential?: unknown } = {}) {
  const store = new Map()
  const credential = options.credential ?? null

  return {
    args: {},
    auth: {
      authenticate: vi.fn(),
      authenticated: vi.fn().mockReturnValue(credential !== null),
      credential: vi.fn().mockReturnValue(credential),
    },
    config: {},
    fail: vi.fn((): never => {
      throw new Error('fail')
    }),
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      message: vi.fn(),
      step: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['test'], name: 'test-cli', version: '1.0.0' },
    output: { markdown: vi.fn(), raw: vi.fn(), table: vi.fn(), write: vi.fn() },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() },
    store: {
      clear: () => store.clear(),
      delete: (key: string) => store.delete(key),
      get: (key: string) => store.get(key),
      has: (key: string) => store.has(key),
      set: (key: string, value: unknown) => store.set(key, value),
    },
  }
}

describe('http()', () => {
  it('should return a Middleware tagged object', () => {
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })

    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should decorate context with client at namespace', async () => {
    const ctx = createMockCtx()
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const client = (ctx as Record<string, unknown>)['api'] as Record<string, unknown>

    expect(client).toBeDefined()
    expect(typeof client.get).toBe('function')
    expect(typeof client.post).toBe('function')
    expect(typeof client.put).toBe('function')
    expect(typeof client.patch).toBe('function')
    expect(typeof client.delete).toBe('function')
  })

  it('should read credential from ctx.auth.credential()', async () => {
    const ctx = createMockCtx({ credential: { token: 'test-token', type: 'bearer' } })
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const client = (ctx as Record<string, unknown>)['api']

    expect(client).toBeDefined()
    expect(next).toHaveBeenCalled()
  })

  it('should work without auth (no credential)', async () => {
    const ctx = createMockCtx()
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const client = (ctx as Record<string, unknown>)['api']

    expect(client).toBeDefined()
    expect(next).toHaveBeenCalled()
  })

  it('should work without auth context on ctx', async () => {
    const ctx = createMockCtx()
    // Remove auth to simulate no auth middleware
    delete (ctx as Record<string, unknown>)['auth']

    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const client = (ctx as Record<string, unknown>)['api']

    expect(client).toBeDefined()
    expect(next).toHaveBeenCalled()
  })

  it('should call next after decorating context', async () => {
    const ctx = createMockCtx()
    const mw = http({ baseUrl: 'https://api.example.com', namespace: 'api' })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
