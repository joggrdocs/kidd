import { hasTag } from '@kidd-cli/utils/tag'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
    const mw = auth({ resolvers: [{ source: 'token' }] })
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
    const mw = auth({ resolvers: [{ source: 'token' }] })
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
    const mw = auth({ resolvers: [{ source: 'token' }] })
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
    const mw = auth({ resolvers: [{ source: 'token' }] })
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

describe('auth.env()', () => {
  it('should return an EnvSourceConfig with source: env', () => {
    const config = auth.env()

    expect(config).toEqual({ source: 'env' })
  })

  it('should include tokenVar when provided', () => {
    const config = auth.env({ tokenVar: 'GH_TOKEN' })

    expect(config).toEqual({ source: 'env', tokenVar: 'GH_TOKEN' })
  })
})

describe('auth.dotenv()', () => {
  it('should return a DotenvSourceConfig with source: dotenv', () => {
    const config = auth.dotenv()

    expect(config).toEqual({ source: 'dotenv' })
  })

  it('should include tokenVar and path when provided', () => {
    const config = auth.dotenv({ path: '.env.local', tokenVar: 'API_TOKEN' })

    expect(config).toEqual({ path: '.env.local', source: 'dotenv', tokenVar: 'API_TOKEN' })
  })
})

describe('auth.file()', () => {
  it('should return a FileSourceConfig with source: file', () => {
    const config = auth.file()

    expect(config).toEqual({ source: 'file' })
  })

  it('should include filename and dirName when provided', () => {
    const config = auth.file({ dirName: '.my-app', filename: 'creds.json' })

    expect(config).toEqual({ dirName: '.my-app', filename: 'creds.json', source: 'file' })
  })
})

describe('auth.oauth()', () => {
  it('should return an OAuthSourceConfig with source: oauth', () => {
    const config = auth.oauth({
      authUrl: 'https://example.com/authorize',
      clientId: 'my-client',
      tokenUrl: 'https://example.com/token',
    })

    expect(config).toEqual({
      authUrl: 'https://example.com/authorize',
      clientId: 'my-client',
      source: 'oauth',
      tokenUrl: 'https://example.com/token',
    })
  })

  it('should include optional fields when provided', () => {
    const config = auth.oauth({
      authUrl: 'https://example.com/authorize',
      clientId: 'my-client',
      port: 8080,
      scopes: ['openid'],
      tokenUrl: 'https://example.com/token',
    })

    expect(config).toMatchObject({ port: 8080, scopes: ['openid'], source: 'oauth' })
  })
})

describe('auth.deviceCode()', () => {
  it('should return a DeviceCodeSourceConfig with source: device-code', () => {
    const config = auth.deviceCode({
      clientId: 'my-client',
      deviceAuthUrl: 'https://example.com/device/code',
      tokenUrl: 'https://example.com/token',
    })

    expect(config).toEqual({
      clientId: 'my-client',
      deviceAuthUrl: 'https://example.com/device/code',
      source: 'device-code',
      tokenUrl: 'https://example.com/token',
    })
  })

  it('should include optional fields when provided', () => {
    const config = auth.deviceCode({
      clientId: 'my-client',
      deviceAuthUrl: 'https://example.com/device/code',
      pollInterval: 3000,
      scopes: ['read'],
      tokenUrl: 'https://example.com/token',
    })

    expect(config).toMatchObject({ pollInterval: 3000, scopes: ['read'], source: 'device-code' })
  })
})

describe('auth.token()', () => {
  it('should return a TokenSourceConfig with source: token', () => {
    const config = auth.token()

    expect(config).toEqual({ source: 'token' })
  })

  it('should include message when provided', () => {
    const config = auth.token({ message: 'Enter token:' })

    expect(config).toEqual({ message: 'Enter token:', source: 'token' })
  })
})

describe('auth.apiKey()', () => {
  it('should return a TokenSourceConfig with source: token (alias)', () => {
    const config = auth.apiKey()

    expect(config).toEqual({ source: 'token' })
  })

  it('should include message when provided', () => {
    const config = auth.apiKey({ message: 'Enter API key:' })

    expect(config).toEqual({ message: 'Enter API key:', source: 'token' })
  })
})

describe('auth.custom()', () => {
  it('should return a CustomSourceConfig with source: custom and the resolver function', () => {
    const resolver = () => null
    const config = auth.custom(resolver)

    expect(config).toEqual({ resolver, source: 'custom' })
  })
})

describe('auth() with http option', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should decorate ctx with an HTTP client at the specified namespace', async () => {
    vi.stubEnv('TEST_CLI_TOKEN', 'http-test-token')

    const ctx = createMockCtx()
    const mw = auth({
      http: { baseUrl: 'https://api.example.com', namespace: 'api' },
      resolvers: [auth.env()],
    })
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

  it('should decorate ctx with multiple HTTP clients from an array', async () => {
    vi.stubEnv('TEST_CLI_TOKEN', 'multi-test-token')

    const ctx = createMockCtx()
    const mw = auth({
      http: [
        { baseUrl: 'https://api.example.com', namespace: 'api' },
        { baseUrl: 'https://admin.example.com', namespace: 'admin' },
      ],
      resolvers: [auth.env()],
    })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const apiClient = (ctx as Record<string, unknown>)['api'] as Record<string, unknown>
    const adminClient = (ctx as Record<string, unknown>)['admin'] as Record<string, unknown>

    expect(apiClient).toBeDefined()
    expect(typeof apiClient.get).toBe('function')
    expect(adminClient).toBeDefined()
    expect(typeof adminClient.get).toBe('function')
  })

  it('should create HTTP client without auth headers when no credential found', async () => {
    const ctx = createMockCtx()
    const mw = auth({
      http: { baseUrl: 'https://api.example.com', namespace: 'api' },
      resolvers: [auth.env()],
    })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const client = (ctx as Record<string, unknown>)['api']

    expect(client).toBeDefined()
    expect(next).toHaveBeenCalledOnce()
  })

  it('should still decorate ctx.auth alongside HTTP clients', async () => {
    const ctx = createMockCtx()
    const mw = auth({
      http: { baseUrl: 'https://api.example.com', namespace: 'api' },
      resolvers: [auth.env()],
    })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const authCtx = (ctx as Record<string, unknown>)['auth'] as {
      credential: () => unknown
    }

    expect(typeof authCtx.credential).toBe('function')
  })
})
