import type { Context } from 'kidd'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('@kidd/bundler'), () => ({
  build: vi.fn(),
  compile: vi.fn(),
  resolveTargetLabel: vi.fn((t: string) => t),
}))

vi.mock(import('@kidd/config/loader'), () => ({
  loadConfig: vi.fn(),
}))

vi.mock(import('kidd'), () => ({
  command: vi.fn((def) => def),
}))

const { build, compile } = await import('@kidd/bundler')
const { loadConfig } = await import('@kidd/config/loader')

const mockedBuild = vi.mocked(build)
const mockedCompile = vi.mocked(compile)
const mockedLoadConfig = vi.mocked(loadConfig)

function makeContext(argOverrides: Record<string, unknown> = {}): Context {
  return {
    args: {
      compile: undefined,
      targets: undefined,
      ...argOverrides,
    },
    config: {},
    fail: vi.fn((msg: string) => {
      throw new Error(msg)
    }) as never,
    logger: {
      child: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      info: vi.fn(),
      note: vi.fn(),
      trace: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['build'], name: 'kidd', version: '0.0.0' },
    output: { markdown: vi.fn(), raw: vi.fn(), table: vi.fn(), write: vi.fn() },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as Context
}

function setupBuildSuccess(): void {
  mockedBuild.mockResolvedValue([
    null,
    { entryFile: '/project/dist/index.js', outDir: '/project/dist' },
  ])
}

function setupCompileSuccess(): void {
  mockedCompile.mockResolvedValue([
    null,
    {
      binaries: [
        { label: 'linux-x64', path: '/project/dist/bin/cli-linux-x64', target: 'linux-x64' as const },
      ],
    },
  ])
}

describe('build command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('process', { ...process, cwd: () => '/project' })
    mockedLoadConfig.mockResolvedValue([
      null,
      { config: {}, configFile: '/project/kidd.config.ts' },
    ] as never)
  })

  describe('resolveCompileIntent', () => {
    it('should not compile when no flags and no config compile', async () => {
      const ctx = makeContext()
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedCompile).not.toHaveBeenCalled()
      expect(ctx.spinner.stop).toHaveBeenCalledWith('Build complete')
    })

    it('should compile when --targets is provided', async () => {
      const ctx = makeContext({ targets: ['darwin-arm64'] })
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedCompile).toHaveBeenCalled()
    })

    it('should compile when --compile is true', async () => {
      const ctx = makeContext({ compile: true })
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedCompile).toHaveBeenCalled()
    })

    it('should not compile when --compile is false', async () => {
      const ctx = makeContext({ compile: false })
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedCompile).not.toHaveBeenCalled()
    })

    it('should compile when config.compile is true', async () => {
      const ctx = makeContext()
      mockedLoadConfig.mockResolvedValue([
        null,
        { config: { compile: true }, configFile: '/project/kidd.config.ts' },
      ] as never)
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedCompile).toHaveBeenCalled()
    })

    it('should compile when config.compile is an object', async () => {
      const ctx = makeContext()
      mockedLoadConfig.mockResolvedValue([
        null,
        {
          config: { compile: { targets: ['linux-x64' as const] } },
          configFile: '/project/kidd.config.ts',
        },
      ] as never)
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedCompile).toHaveBeenCalled()
    })
  })

  describe('mergeCompileTargets', () => {
    it('should use config targets when no CLI targets are provided', async () => {
      const ctx = makeContext({ compile: true })
      mockedLoadConfig.mockResolvedValue([
        null,
        {
          config: { compile: { targets: ['linux-x64' as const] } },
          configFile: '/project/kidd.config.ts',
        },
      ] as never)
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      const compileCall = mockedCompile.mock.calls[0]![0]!
      expect(compileCall.config).toMatchObject({
        compile: { targets: ['linux-x64'] },
      })
    })

    it('should override config targets with CLI targets', async () => {
      const ctx = makeContext({ targets: ['darwin-arm64', 'linux-x64'] })
      mockedLoadConfig.mockResolvedValue([
        null,
        {
          config: { compile: { targets: ['windows-x64' as const] } },
          configFile: '/project/kidd.config.ts',
        },
      ] as never)
      setupBuildSuccess()
      setupCompileSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      const compileCall = mockedCompile.mock.calls[0]![0]!
      expect(compileCall.config).toMatchObject({
        compile: { targets: ['darwin-arm64', 'linux-x64'] },
      })
    })
  })

  describe('formatBuildNote', () => {
    it('should display relative entry and output paths', async () => {
      const ctx = makeContext()
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      const noteCall = vi.mocked(ctx.logger.note).mock.calls[0]!
      expect(noteCall[0]).toContain('entry   dist/index.js')
      expect(noteCall[0]).toContain('output  dist')
      expect(noteCall[1]).toBe('Bundle')
    })
  })

  describe('formatBinariesNote', () => {
    it('should display aligned binary labels and paths', async () => {
      const ctx = makeContext({ compile: true })
      mockedLoadConfig.mockResolvedValue([
        null,
        { config: { compile: true }, configFile: '/project/kidd.config.ts' },
      ] as never)
      setupBuildSuccess()
      mockedCompile.mockResolvedValue([
        null,
        {
          binaries: [
            { label: 'macOS ARM64', path: '/project/dist/bin/cli-darwin-arm64', target: 'darwin-arm64' as const },
            { label: 'Linux x64', path: '/project/dist/bin/cli-linux-x64', target: 'linux-x64' as const },
          ],
        },
      ])

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      const mockNote = ctx.logger.note as ReturnType<typeof vi.fn>
      const binariesNote = mockNote.mock.calls.find(
        (call: readonly [unknown, unknown]) => call[1] === 'Binaries'
      )
      expect(binariesNote).toBeDefined()
      const noteBody = binariesNote[0] as string
      expect(noteBody).toContain('macOS ARM64')
      expect(noteBody).toContain('Linux x64')
      expect(noteBody).toContain('dist/bin/cli-darwin-arm64')
      expect(noteBody).toContain('dist/bin/cli-linux-x64')
    })
  })

  describe('extractConfig', () => {
    it('should use config from loadConfig result', async () => {
      const ctx = makeContext()
      mockedLoadConfig.mockResolvedValue([
        null,
        { config: { entry: './src/main.ts' }, configFile: '/project/kidd.config.ts' },
      ] as never)
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({ config: { entry: './src/main.ts' } })
      )
    })

    it('should fall back to empty config when loadConfig returns error', async () => {
      const ctx = makeContext()
      mockedLoadConfig.mockResolvedValue([new Error('no config'), null] as never)
      setupBuildSuccess()

      const mod = await import('./build.js')
      await mod.default.handler!(ctx)

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({ config: {} })
      )
    })
  })

  describe('error handling', () => {
    it('should call fail when build returns an error', async () => {
      const ctx = makeContext()
      mockedBuild.mockResolvedValue([new Error('tsdown build failed'), null])

      const mod = await import('./build.js')
      await expect(mod.default.handler!(ctx)).rejects.toThrow('tsdown build failed')

      expect(ctx.spinner.stop).toHaveBeenCalledWith('Bundle failed')
    })

    it('should call fail when compile returns an error', async () => {
      const ctx = makeContext({ compile: true })
      setupBuildSuccess()
      mockedCompile.mockResolvedValue([new Error('bun compile failed'), null])

      const mod = await import('./build.js')
      await expect(mod.default.handler!(ctx)).rejects.toThrow('bun compile failed')

      expect(ctx.spinner.stop).toHaveBeenCalledWith('Compile failed')
    })
  })
})
