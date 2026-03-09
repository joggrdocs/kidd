import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Prompts } from '@/context/types.js'

import { createAuthContext } from './create-auth-context.js'

vi.mock(import('./resolve-credentials.js'), () => ({
  resolveCredentials: vi.fn(),
}))

vi.mock(import('@/lib/store/create-store.js'), () => ({
  createStore: vi.fn(),
}))

import { createStore } from '@/lib/store/create-store.js'

import { resolveCredentials } from './resolve-credentials.js'

function createMockPrompts(): Prompts {
  return {
    confirm: vi.fn(),
    multiselect: vi.fn(),
    password: vi.fn(),
    select: vi.fn(),
    text: vi.fn(),
  }
}

describe('createAuthContext()', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('credential()', () => {
    it('should return the passively resolved credential', () => {
      const credential = { token: 'saved-token', type: 'bearer' as const }
      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => credential,
        resolvers: [],
      })

      expect(ctx.credential()).toEqual(credential)
    })

    it('should return null when no credential is available', () => {
      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [],
      })

      expect(ctx.credential()).toBeNull()
    })

    it('should call resolveCredential on each invocation', () => {
      const resolver = vi.fn().mockReturnValue(null)
      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: resolver,
        resolvers: [],
      })

      ctx.credential()
      ctx.credential()

      expect(resolver).toHaveBeenCalledTimes(2)
    })
  })

  describe('authenticated()', () => {
    it('should return true when a credential exists', () => {
      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => ({ token: 'x', type: 'bearer' as const }),
        resolvers: [],
      })

      expect(ctx.authenticated()).toBeTruthy()
    })

    it('should return false when no credential exists', () => {
      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [],
      })

      expect(ctx.authenticated()).toBeFalsy()
    })
  })

  describe('authenticate()', () => {
    it('should return credential on success', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      vi.mocked(resolveCredentials).mockResolvedValue(credential)
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        save: vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json']),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [{ source: 'token' }],
      })

      const [error, result] = await ctx.authenticate()

      expect(error).toBeNull()
      expect(result).toEqual(credential)
    })

    it('should return no_credential error when no resolver produces a credential', async () => {
      vi.mocked(resolveCredentials).mockResolvedValue(null)

      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [{ source: 'token' }],
      })

      const [error] = await ctx.authenticate()

      expect(error).toMatchObject({ type: 'no_credential' })
    })

    it('should return save_failed error when store.save fails', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      vi.mocked(resolveCredentials).mockResolvedValue(credential)
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        save: vi.fn().mockReturnValue([new Error('disk full'), null]),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [{ source: 'token' }],
      })

      const [error] = await ctx.authenticate()

      expect(error).toMatchObject({ type: 'save_failed' })
    })

    it('should pass resolvers to resolveCredentials', async () => {
      const resolvers = [
        { authUrl: 'http://example.com/auth', source: 'oauth' as const },
        { source: 'token' as const },
      ]
      vi.mocked(resolveCredentials).mockResolvedValue(null)

      const prompts = createMockPrompts()
      const ctx = createAuthContext({
        cliName: 'my-app',
        prompts,
        resolveCredential: () => null,
        resolvers,
      })

      await ctx.authenticate()

      expect(resolveCredentials).toHaveBeenCalledWith({
        cliName: 'my-app',
        prompts,
        resolvers,
      })
    })
  })
})
