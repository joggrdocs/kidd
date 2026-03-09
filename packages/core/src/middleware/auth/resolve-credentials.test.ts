import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'), () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

vi.mock(import('./resolve-file.js'), () => ({
  resolveFromFile: vi.fn(),
}))

vi.mock(import('./resolve-oauth.js'), () => ({
  resolveFromOAuth: vi.fn(),
}))

vi.mock(import('./resolve-device-code.js'), () => ({
  resolveFromDeviceCode: vi.fn(),
}))

import { readFileSync } from 'node:fs'

import type { Prompts } from '@/context/types.js'

import { resolveCredentials } from './resolve-credentials.js'
import { resolveFromDeviceCode } from './resolve-device-code.js'
import { resolveFromDotenv } from './resolve-dotenv.js'
import { resolveFromEnv } from './resolve-env.js'
import { resolveFromFile } from './resolve-file.js'
import { resolveFromOAuth } from './resolve-oauth.js'
import { resolveFromPrompt } from './resolve-prompt.js'

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
    vi.mocked(readFileSync).mockReturnValue('MY_TOKEN=secret-value\n')

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toEqual({ token: 'secret-value', type: 'bearer' })
  })

  it('should return null when .env file does not exist', () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toBeNull()
  })

  it('should return null when variable not in .env file', () => {
    vi.mocked(readFileSync).mockReturnValue('OTHER_VAR=value\n')

    const result = resolveFromDotenv({ path: '/app/.env', tokenVar: 'MY_TOKEN' })

    expect(result).toBeNull()
  })

  it('should return null when readFileSync throws', () => {
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
    vi.clearAllMocks()
  })

  it('should return first resolved credential (short-circuit)', async () => {
    vi.stubEnv('MY_CLI_TOKEN', 'from-env')

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [{ source: 'env' }, { source: 'prompt' }],
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
      resolvers: [{ source: 'env' }, { source: 'prompt' }],
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

  it('should dispatch to file resolver with default filename and dirName', async () => {
    vi.mocked(resolveFromFile).mockReturnValue({ token: 'from-file', type: 'bearer' })

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [{ source: 'file' }],
    })

    expect(result).toEqual({ token: 'from-file', type: 'bearer' })
    expect(resolveFromFile).toHaveBeenCalledWith({
      dirName: '.my-cli',
      filename: 'auth.json',
    })
  })

  it('should dispatch to file resolver with custom filename and dirName', async () => {
    vi.mocked(resolveFromFile).mockReturnValue({ token: 'from-custom-file', type: 'bearer' })

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [{ dirName: '.my-custom-dir', filename: 'creds.json', source: 'file' }],
    })

    expect(result).toEqual({ token: 'from-custom-file', type: 'bearer' })
    expect(resolveFromFile).toHaveBeenCalledWith({
      dirName: '.my-custom-dir',
      filename: 'creds.json',
    })
  })

  it('should dispatch to oauth resolver with PKCE fields', async () => {
    vi.mocked(resolveFromOAuth).mockResolvedValue({ token: 'from-oauth', type: 'bearer' })

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [
        {
          authUrl: 'https://auth.example.com/authorize',
          clientId: 'my-client',
          source: 'oauth',
          tokenUrl: 'https://auth.example.com/token',
        },
      ],
    })

    expect(result).toEqual({ token: 'from-oauth', type: 'bearer' })
    expect(resolveFromOAuth).toHaveBeenCalledWith({
      authUrl: 'https://auth.example.com/authorize',
      callbackPath: '/callback',
      clientId: 'my-client',
      port: 0,
      scopes: [],
      timeout: 120_000,
      tokenUrl: 'https://auth.example.com/token',
    })
  })

  it('should dispatch to device-code resolver', async () => {
    vi.mocked(resolveFromDeviceCode).mockResolvedValue({
      token: 'from-device',
      type: 'bearer',
    })

    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [
        {
          clientId: 'my-client',
          deviceAuthUrl: 'https://auth.example.com/device/code',
          source: 'device-code',
          tokenUrl: 'https://auth.example.com/token',
        },
      ],
    })

    expect(result).toEqual({ token: 'from-device', type: 'bearer' })
    expect(resolveFromDeviceCode).toHaveBeenCalledWith({
      clientId: 'my-client',
      deviceAuthUrl: 'https://auth.example.com/device/code',
      pollInterval: 5000,
      prompts,
      scopes: [],
      timeout: 300_000,
      tokenUrl: 'https://auth.example.com/token',
    })
  })

  it('should return null when custom resolver returns null', async () => {
    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [
        {
          resolver: () => null,
          source: 'custom' as const,
        },
      ],
    })

    expect(result).toBeNull()
  })

  it('should handle empty resolvers array', async () => {
    const prompts = { password: vi.fn() } as unknown as Prompts
    const result = await resolveCredentials({
      cliName: 'my-cli',
      prompts,
      resolvers: [],
    })

    expect(result).toBeNull()
  })
})
