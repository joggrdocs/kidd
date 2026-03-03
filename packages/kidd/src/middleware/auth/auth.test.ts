import { afterEach, describe, expect, it, vi } from 'vitest'

import { hasTag } from '@kidd/utils/tag'

import { auth } from './auth.js'

function createMockCtx(options?: { readonly envToken?: string }) {
  const store = new Map()

  if (options !== undefined && options.envToken !== undefined) {
    vi.stubEnv('TEST_CLI_TOKEN', options.envToken)
  }

  return {
    args: {},
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

describe('auth()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return a Middleware tagged object', () => {
    const mw = auth({ resolvers: [{ source: 'env' }] })

    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should decorate ctx.auth with credential() that resolves from env', async () => {
    const ctx = createMockCtx({ envToken: 'my-secret' })
    const mw = auth({ resolvers: [{ source: 'prompt' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      authenticate: unknown
      authenticated: unknown
      credential: () => unknown
    }

    expect(authCtx.credential()).toEqual({ token: 'my-secret', type: 'bearer' })
  })

  it('should decorate ctx.auth with credential() returning null when nothing found', async () => {
    const ctx = createMockCtx()
    const mw = auth({ resolvers: [{ source: 'prompt' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      authenticate: unknown
      authenticated: unknown
      credential: () => unknown
    }

    expect(authCtx.credential()).toBeNull()
  })

  it('should provide an authenticate function on ctx.auth', async () => {
    const ctx = createMockCtx()
    const mw = auth({ resolvers: [{ source: 'prompt' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      authenticate: unknown
      authenticated: unknown
      credential: unknown
    }

    expect(typeof authCtx.authenticate).toBe('function')
  })

  it('should provide an authenticated function on ctx.auth', async () => {
    const ctx = createMockCtx({ envToken: 'my-secret' })
    const mw = auth({ resolvers: [{ source: 'prompt' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      authenticated: () => boolean
    }

    expect(authCtx.authenticated()).toBeTruthy()
  })

  it('should call next after decorating', async () => {
    const ctx = createMockCtx()
    const mw = auth({ resolvers: [{ source: 'env' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('should never fail even when no credential found (no required behavior)', async () => {
    const ctx = createMockCtx()
    const mw = auth({ resolvers: [{ source: 'env' }] })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(ctx.fail).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})
