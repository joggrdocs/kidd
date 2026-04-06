import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { decorateContext } from '@/context/decorate.js'
import { createContext } from '@/context/index.js'

import { config } from './config.js'
import type { ConfigHandle, ConfigLoadCallResult } from './types.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  spinner: vi.fn(() => mockSpinnerInstance),
}))

const schema = z.object({
  name: z.string(),
  port: z.number().default(3000),
})

type TestConfig = z.infer<typeof schema>

const validConfig: TestConfig = { name: 'test-app', port: 8080 }

function createTmpDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'kidd-config-mw-')))
  mkdirSync(join(dir, '.git'), { recursive: true })
  return dir
}

function createTestContext(): ReturnType<typeof createContext> {
  return createContext({
    args: {},
    argv: ['my-cli', 'test'],
    meta: {
      command: ['test'],
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    },
  })
}

function writeConfig(dir: string, data: Record<string, unknown>): void {
  writeFileSync(join(dir, 'my-cli.config.json'), JSON.stringify(data, null, 2))
}

describe('config middleware', () => {
  const originalCwd = process.cwd()

  afterEach(() => {
    process.chdir(originalCwd)
  })

  describe('lazy mode (default)', () => {
    it('should decorate ctx.config as a handle with load()', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      const next = vi.fn(() => Promise.resolve())

      await mw.handler(ctx, next)

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      expect(handle).toBeDefined()
      expect(typeof handle.load).toBe('function')
      expect(next).toHaveBeenCalledOnce()

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should load config from disk when load() is called', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      const [error, result] = await handle.load()

      expect(error).toBeNull()
      expect(result).toBeDefined()
      expect(result!.config).toMatchObject({ name: 'test-app', port: 8080 })

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should return empty config when no config file exists', async () => {
      const tmpDir = createTmpDir()
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema: z.object({ name: z.string().optional() }) })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<unknown>
      const [error, result] = await handle.load()

      expect(error).toBeNull()
      expect(result).toBeDefined()
      expect(result!.config).toEqual({})

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('caching', () => {
    it('should return cached result on subsequent load() calls', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      const [, first] = await handle.load()
      const [, second] = await handle.load()

      expect(first).toBe(second)

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('eager mode', () => {
    it('should pre-load config during middleware pass', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ eager: true, schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      const [error, result] = await handle.load()

      expect(error).toBeNull()
      expect(result!.config).toMatchObject({ name: 'test-app', port: 8080 })

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should call ctx.fail() when eager load fails validation', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, { invalid: true })
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ eager: true, schema })

      // Ctx.fail() throws a ContextError, so we expect it to propagate
      await expect(
        mw.handler(
          ctx,
          vi.fn(() => Promise.resolve())
        )
      ).rejects.toThrow('Failed to load config')

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('layered load', () => {
    it('should merge layers and return layer metadata', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      const [error, result] = await handle.load({ layers: true })

      expect(error).toBeNull()
      expect(result).toBeDefined()
      expect(result!.layers).toBeDefined()
      expect(result!.layers).toHaveLength(3)
      expect(result!.layers!.map((l) => l.name)).toEqual(['global', 'project', 'local'])

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should return empty config when no layers have config files', async () => {
      const tmpDir = createTmpDir()
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema: z.object({ name: z.string().optional() }) })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<unknown>
      const [error, result] = await handle.load({ layers: true })

      expect(error).toBeNull()
      expect(result!.config).toEqual({})
      expect(result!.layers).toBeDefined()

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('single-layer load', () => {
    it('should load config from the project layer', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      const [error, result] = await handle.load({ layer: 'project' })

      expect(error).toBeNull()
      expect(result!.config).toMatchObject({ name: 'test-app', port: 8080 })

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('error handling', () => {
    it('should return error result for invalid config', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, { invalid: true })
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      const [error] = await handle.load()

      expect(error).toBeDefined()
      expect(error).not.toBeNull()

      rmSync(tmpDir, { force: true, recursive: true })
    })

    it('should not cache error results', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, { invalid: true })
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      const [firstError] = await handle.load()
      expect(firstError).not.toBeNull()

      // Second call should also attempt to load (not return a cached success)
      const [secondError] = await handle.load()
      expect(secondError).not.toBeNull()

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })

  describe('frozen data', () => {
    it('should return deeply frozen config data', async () => {
      const tmpDir = createTmpDir()
      writeConfig(tmpDir, validConfig)
      process.chdir(tmpDir)

      const ctx = createTestContext()
      const mw = config({ schema })
      await mw.handler(
        ctx,
        vi.fn(() => Promise.resolve())
      )

      const handle = (ctx as unknown as Record<string, unknown>).config as ConfigHandle<TestConfig>
      const [, result] = await handle.load()

      expect(Object.isFrozen(result!.config)).toBeTruthy()

      rmSync(tmpDir, { force: true, recursive: true })
    })
  })
})
