import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Prompts } from '@/context/types.js'

import { createAuthContext } from './context.js'

vi.mock(import('./chain.js'), () => ({
  runStrategyChain: vi.fn(),
}))

vi.mock(import('@/lib/store/create-store.js'), () => ({
  createStore: vi.fn(),
}))

import { createStore } from '@/lib/store/create-store.js'

import { runStrategyChain } from './chain.js'

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

  describe('login()', () => {
    it('should return credential on success', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json']),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [{ source: 'token' }],
      })

      const [error, result] = await ctx.login()

      expect(error).toBeNull()
      expect(result).toEqual(credential)
    })

    it('should return no_credential error when no resolver produces a credential', async () => {
      vi.mocked(runStrategyChain).mockResolvedValue(null)

      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [{ source: 'token' }],
      })

      const [error] = await ctx.login()

      expect(error).toMatchObject({ type: 'no_credential' })
    })

    it('should return save_failed error when store.save fails', async () => {
      const credential = { token: 'new-token', type: 'bearer' as const }
      vi.mocked(runStrategyChain).mockResolvedValue(credential)
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn(),
        save: vi.fn().mockReturnValue([new Error('disk full'), null]),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [{ source: 'token' }],
      })

      const [error] = await ctx.login()

      expect(error).toMatchObject({ type: 'save_failed' })
    })

    it('should pass resolvers to runStrategyChain', async () => {
      const resolvers = [
        { authUrl: 'http://example.com/auth', source: 'oauth' as const },
        { source: 'token' as const },
      ]
      vi.mocked(runStrategyChain).mockResolvedValue(null)

      const prompts = createMockPrompts()
      const ctx = createAuthContext({
        cliName: 'my-app',
        prompts,
        resolveCredential: () => null,
        resolvers,
      })

      await ctx.login()

      expect(runStrategyChain).toHaveBeenCalledWith({
        cliName: 'my-app',
        prompts,
        resolvers,
      })
    })
  })

  describe('logout()', () => {
    it('should remove the credential file and return ok', async () => {
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn().mockReturnValue([null, '/home/.test-cli/auth.json']),
        save: vi.fn(),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [],
      })

      const [error, filePath] = await ctx.logout()

      expect(error).toBeNull()
      expect(filePath).toBe('/home/.test-cli/auth.json')
    })

    it('should return remove_failed error when store.remove fails', async () => {
      vi.mocked(createStore).mockReturnValue({
        getFilePath: vi.fn(),
        getGlobalDir: vi.fn(),
        getLocalDir: vi.fn(),
        load: vi.fn(),
        loadRaw: vi.fn(),
        remove: vi.fn().mockReturnValue([new Error('permission denied'), null]),
        save: vi.fn(),
      })

      const ctx = createAuthContext({
        cliName: 'test-cli',
        prompts: createMockPrompts(),
        resolveCredential: () => null,
        resolvers: [],
      })

      const [error] = await ctx.logout()

      expect(error).toMatchObject({ type: 'remove_failed' })
    })
  })
})
