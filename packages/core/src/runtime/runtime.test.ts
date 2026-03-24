import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Context } from '@/context/types.js'

import type { ResolvedExecution } from './types.js'

vi.mock(import('@/context/index.js'), () => ({
  createContext: vi.fn(() => ({ mock: 'context' })),
}))

vi.mock(import('@/lib/config/index.js'), () => ({
  createConfigClient: vi.fn(),
}))

vi.mock(import('./args/index.js'), () => ({
  createArgsParser: vi.fn(),
}))

vi.mock(import('./runner.js'), () => ({
  createMiddlewareExecutor: vi.fn(),
}))

const { createContext } = await import('@/context/index.js')
const { createConfigClient } = await import('@/lib/config/index.js')
const { createArgsParser } = await import('./args/index.js')
const { createMiddlewareExecutor } = await import('./runner.js')

const mockedCreateContext = vi.mocked(createContext)
const mockedCreateConfigClient = vi.mocked(createConfigClient)
const mockedCreateArgsParser = vi.mocked(createArgsParser)
const mockedCreateRunner = vi.mocked(createMiddlewareExecutor)

function makeExecution(overrides: Partial<ResolvedExecution> = {}): ResolvedExecution {
  return {
    commandPath: ['test'],
    handler: vi.fn(),
    middleware: [],
    options: undefined,
    positionals: undefined,
    rawArgs: {},
    ...overrides,
  }
}

function setupDefaults(): void {
  mockedCreateArgsParser.mockReturnValue({
    parse: vi.fn().mockReturnValue([null, { verbose: true }]),
  })
  mockedCreateRunner.mockReturnValue({
    execute: vi.fn().mockResolvedValue(undefined),
  })
  mockedCreateContext.mockReturnValue({ mock: 'context' } as unknown as Context)
}

describe('createRuntime()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return ok result on successful creation', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [error, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    expect(error).toBeNull()
    expect(runtime).toBeDefined()
    expect(runtime).toHaveProperty('execute')
  })

  it('should use empty config when no config options provided', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    await runtime!.execute(execution)

    expect(mockedCreateContext).toHaveBeenCalledWith(expect.objectContaining({ config: {} }))
  })

  it('should use empty config when config schema is undefined', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      config: {} as never,
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    await runtime!.execute(execution)

    expect(mockedCreateConfigClient).not.toHaveBeenCalled()
    expect(mockedCreateContext).toHaveBeenCalledWith(expect.objectContaining({ config: {} }))
  })

  it('should use empty config when config client load returns error', async () => {
    setupDefaults()
    const mockLoad = vi.fn().mockResolvedValue([new Error('config not found'), null])
    mockedCreateConfigClient.mockReturnValue({ load: mockLoad } as never)

    const { z } = await import('zod')
    const schema = z.object({ debug: z.boolean() })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      config: { schema },
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    await runtime!.execute(execution)

    expect(mockedCreateConfigClient).toHaveBeenCalled()
    expect(mockedCreateContext).toHaveBeenCalledWith(expect.objectContaining({ config: {} }))
  })

  it('should use loaded config when config client load succeeds', async () => {
    setupDefaults()
    const loadedConfig = { debug: true }
    const mockLoad = vi.fn().mockResolvedValue([null, { config: loadedConfig }])
    mockedCreateConfigClient.mockReturnValue({ load: mockLoad } as never)

    const { z } = await import('zod')
    const schema = z.object({ debug: z.boolean() })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      config: { schema },
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    await runtime!.execute(execution)

    expect(mockedCreateContext).toHaveBeenCalledWith(
      expect.objectContaining({ config: loadedConfig })
    )
  })

  it('should return err when arg parsing fails', async () => {
    setupDefaults()
    mockedCreateArgsParser.mockReturnValue({
      parse: vi.fn().mockReturnValue([new Error('Invalid arguments'), null]),
    })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeInstanceOf(Error)
    expect(execError!.message).toBe('Invalid arguments')
  })

  it('should use noop handler when handler is undefined', async () => {
    const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
    setupDefaults()
    mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution({ handler: undefined })
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeNull()
    expect(mockRunnerExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        handler: expect.any(Function),
      })
    )

    const passedHandler = mockRunnerExecute.mock.calls[0][0].handler as (
      ctx: Context
    ) => Promise<void>
    await expect(passedHandler({} as Context)).resolves.toBeUndefined()
  })

  it('should return err when runner.execute throws', async () => {
    setupDefaults()
    mockedCreateRunner.mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error('Middleware blew up')),
    })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeInstanceOf(Error)
    expect(execError!.message).toBe('Middleware blew up')
  })

  it('should pass validated args and meta to createContext', async () => {
    const validatedArgs = { file: 'index.ts', verbose: true }
    setupDefaults()
    mockedCreateArgsParser.mockReturnValue({
      parse: vi.fn().mockReturnValue([null, validatedArgs]),
    })

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '2.0.0',
    })

    const execution = makeExecution({ commandPath: ['build', 'all'] })
    await runtime!.execute(execution)

    expect(mockedCreateContext).toHaveBeenCalledWith({
      args: validatedArgs,
      config: {},
      meta: {
        command: ['build', 'all'],
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '2.0.0',
      },
    })
  })

  it('should pass command middleware to runner.execute', async () => {
    const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
    setupDefaults()
    mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })

    const commandMiddleware = [{ handler: vi.fn() }]

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution({ middleware: commandMiddleware as never })
    await runtime!.execute(execution)

    expect(mockRunnerExecute).toHaveBeenCalledWith(
      expect.objectContaining({ middleware: commandMiddleware })
    )
  })

  it('should return ok result on successful execution', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      dirs: { global: '.my-cli', local: '.my-cli' },
      name: 'my-cli',
      version: '1.0.0',
    })

    const execution = makeExecution()
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeNull()
  })

  describe('render execution', () => {
    it('should invoke render when present on the execution', async () => {
      setupDefaults()
      const renderFn = vi.fn().mockResolvedValue(undefined)

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const execution = makeExecution({ handler: undefined, render: renderFn })
      const [execError] = await runtime!.execute(execution)

      expect(execError).toBeNull()
      expect(renderFn).toHaveBeenCalledOnce()
    })

    it('should pass the full context to render', async () => {
      const fakeContext = { args: { env: 'staging' }, mock: 'context' } as unknown as Context

      setupDefaults()
      mockedCreateContext.mockReturnValue(fakeContext)

      const renderFn = vi.fn().mockResolvedValue(undefined)

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '2.0.0',
      })

      const execution = makeExecution({
        commandPath: ['deploy'],
        handler: undefined,
        render: renderFn,
      })
      await runtime!.execute(execution)

      expect(renderFn).toHaveBeenCalledWith(fakeContext)
    })

    it('should skip middleware runner when render is present', async () => {
      const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
      setupDefaults()
      mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })
      const renderFn = vi.fn().mockResolvedValue(undefined)

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const execution = makeExecution({ handler: vi.fn(), render: renderFn })
      await runtime!.execute(execution)

      expect(renderFn).toHaveBeenCalledOnce()
      expect(mockRunnerExecute).not.toHaveBeenCalled()
    })

    it('should return err when render throws', async () => {
      setupDefaults()
      const renderFn = vi.fn().mockRejectedValue(new Error('Render failed'))

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const execution = makeExecution({ handler: undefined, render: renderFn })
      const [execError] = await runtime!.execute(execution)

      expect(execError).toBeInstanceOf(Error)
      expect(execError!.message).toBe('Render failed')
    })

    it('should fall through to handler when render is undefined', async () => {
      const mockRunnerExecute = vi.fn().mockResolvedValue(undefined)
      setupDefaults()
      mockedCreateRunner.mockReturnValue({ execute: mockRunnerExecute })

      const { createRuntime } = await import('./runtime.js')
      const [, runtime] = await createRuntime({
        dirs: { global: '.my-cli', local: '.my-cli' },
        name: 'my-cli',
        version: '1.0.0',
      })

      const handler = vi.fn()
      const execution = makeExecution({ handler, render: undefined })
      const [execError] = await runtime!.execute(execution)

      expect(execError).toBeNull()
      expect(mockRunnerExecute).toHaveBeenCalledWith(expect.objectContaining({ handler }))
    })
  })
})
