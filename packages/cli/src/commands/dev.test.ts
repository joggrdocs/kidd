import type { Context } from 'kidd'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('@kidd-cli/bundler'), () => ({
  watch: vi.fn(),
}))

vi.mock(import('@kidd-cli/config/loader'), () => ({
  loadConfig: vi.fn(),
}))

vi.mock(import('kidd'), () => ({
  command: vi.fn((def) => def),
}))

const { watch } = await import('@kidd-cli/bundler')
const { loadConfig } = await import('@kidd-cli/config/loader')
const mockedWatch = vi.mocked(watch)
const mockedLoadConfig = vi.mocked(loadConfig)

function makeContext(): Context {
  return {
    args: {},
    config: {},
    fail: vi.fn(),
    logger: {
      child: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
      trace: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['dev'], name: 'kidd', version: '0.0.0' },
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

describe('dev command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start spinner with dev server message', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {}, configFile: undefined }] as never)
    mockedWatch.mockResolvedValue([null, undefined] as never)

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(ctx.spinner.start).toHaveBeenCalledWith('Starting dev server...')
  })

  it('should stop spinner with watching message on first build success', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {}, configFile: undefined }] as never)
    mockedWatch.mockImplementation(async (opts) => {
      if (opts.onSuccess) {
        opts.onSuccess()
      }
      return [null, undefined] as never
    })

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(ctx.spinner.stop).toHaveBeenCalledWith('Watching for changes...')
  })

  it('should log rebuilt successfully on subsequent builds', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {}, configFile: undefined }] as never)
    mockedWatch.mockImplementation(async (opts) => {
      if (opts.onSuccess) {
        opts.onSuccess()
        opts.onSuccess()
      }
      return [null, undefined] as never
    })

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(ctx.logger.success).toHaveBeenCalledWith('Rebuilt successfully')
  })

  it('should call fail when watch returns an error', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {}, configFile: undefined }] as never)
    mockedWatch.mockResolvedValue([new Error('tsdown watch failed'), null] as never)

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(ctx.spinner.stop).toHaveBeenCalledWith('Watch failed')
    expect(ctx.fail).toHaveBeenCalledWith('tsdown watch failed')
  })

  it('should use empty config when loadConfig returns error', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([new Error('no config'), null] as never)
    mockedWatch.mockResolvedValue([null, undefined] as never)

    const mod = await import('./dev.js')
    await mod.default.handler!(ctx)

    expect(mockedWatch).toHaveBeenCalledWith(
      expect.objectContaining({ config: {} })
    )
  })
})
