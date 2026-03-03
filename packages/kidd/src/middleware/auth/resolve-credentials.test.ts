import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'), () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

import { existsSync, readFileSync } from 'node:fs'

import type { Prompts } from '@/context/types.js'

import { resolveFromDotenv } from './resolve-dotenv.js'
import { resolveFromEnv } from './resolve-env.js'
import { resolveFromPrompt } from './resolve-prompt.js'
import { resolveCredentials } from './resolve-credentials.js'

describe('resolveFromEnv()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return BearerCredential when env var exists', () => {
    vi.stubEnv('MY_TOKEN', 'abc123')

    const result = resolveFromEnv({ tokenVar: 'MY_TOKEN' })

    expect(result).toEqual({ token: 'abc123', type: 'bearer' })
  })

  it('should return null when env var is not set', () => {
    const result = resolveFromEnv({ tokenVar: 'NONEXISTENT_VAR' })

    expect(result).toBeNull()
  })

  it('should return null when env var is empty string', () => {
    vi.stubEnv('EMPTY_TOKEN', '')

    const result = resolveFromEnv({ tokenVar: 'EMPTY_TOKEN' })

    expect(result).toBeNull()
  })
})

describe('resolveFromDotenv()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return BearerCredential when variable found in .env file', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('MY_TOKEN=secret-value\n')

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toEqual({ token: 'secret-value', type: 'bearer' })
  })

  it('should return null when .env file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toBeNull()
  })

  it('should return null when variable not in .env file', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('OTHER_VAR=value\n')

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toBeNull()
  })

  it('should return null when readFileSync throws', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('read error')
    })

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toBeNull()
  })
})

describe('resolveFromPrompt()', () => {
  it('should return BearerCredential when user provides input', async () => {
    const prompts = { password: vi.fn().mockResolvedValue('user-token') } as unknown as Prompts

    const result = await resolveFromPrompt({ message: 'Enter token', prompts })

    expect(result).toEqual({ token: 'user-token', type: 'bearer' })
  })

  it('should return null when user cancels prompt', async () => {
    const prompts = {
      password: vi.fn().mockRejectedValue(new Error('cancelled')),
    } as unknown as Prompts

    const result = await resolveFromPrompt({ message: 'Enter token', prompts })

    expect(result).toBeNull()
  })

  it('should return null when user provides empty input', async () => {
    const prompts = { password: vi.fn().mockResolvedValue('') } as unknown as Prompts

    const result = await resolveFromPrompt({ message: 'Enter token', prompts })

    expect(result).toBeNull()
  })
})

describe('resolveCredentials()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should return first resolved credential (short-circuit)', async () => {
    vi.stubEnv('MY_CLI_TOKEN', 'from-env')

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [
        { source: 'env' },
        { source: 'prompt' },
      ],
    })

    expect(result).toEqual({ token: 'from-env', type: 'bearer' })
    expect(prompts.password).not.toHaveBeenCalled()
  })

  it('should return null when all resolvers return null', async () => {
    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [{ source: 'env' }],
    })

    expect(result).toBeNull()
  })

  it('should derive tokenVar from CLI name (kebab-case to SCREAMING_SNAKE_CASE + _TOKEN)', async () => {
    vi.stubEnv('MY_COOL_APP_TOKEN', 'derived-token')

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cool-app',
      prompts,
      resolvers: [{ source: 'env' }],
    })

    expect(result).toEqual({ token: 'derived-token', type: 'bearer' })
  })

  it('should try resolvers in order', async () => {
    const prompts = {
      password: vi.fn().mockResolvedValue('from-prompt'),
    } as unknown as Prompts

    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [
        { source: 'env' },
        { source: 'prompt' },
      ],
    })

    expect(result).toEqual({ token: 'from-prompt', type: 'bearer' })
    expect(prompts.password).toHaveBeenCalled()
  })

  it('should use custom resolver', async () => {
    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [
        {
          resolver: () => ({ token: 'custom', type: 'bearer' as const }),
          source: 'custom' as const,
        },
      ],
    })

    expect(result).toEqual({ token: 'custom', type: 'bearer' })
  })
})
