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
  createRunner: vi.fn(),
}))

const { createContext } = await import('@/context/index.js')
const { createConfigClient } = await import('@/lib/config/index.js')
const { createArgsParser } = await import('./args/index.js')
const { createRunner } = await import('./runner.js')

const mockedCreateContext = vi.mocked(createContext)
const mockedCreateConfigClient = vi.mocked(createConfigClient)
const mockedCreateArgsParser = vi.mocked(createArgsParser)
const mockedCreateRunner = vi.mocked(createRunner)

function makeExecution(overrides: Partial<ResolvedExecution> = {}): ResolvedExecution {
  return {
    args: undefined,
    commandPath: ['test'],
    handler: vi.fn(),
    middleware: [],
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
    const [error, runtime] = await createRuntime({ name: 'my-cli', version: '1.0.0' })

    expect(error).toBeNull()
    expect(runtime).toBeDefined()
    expect(runtime).toHaveProperty('execute')
  })

  it('should use empty config when no config options provided', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({ name: 'my-cli', version: '1.0.0' })

    const execution = makeExecution()
    await runtime!.execute(execution)

    expect(mockedCreateContext).toHaveBeenCalledWith(expect.objectContaining({ config: {} }))
  })

  it('should use empty config when config schema is undefined', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({
      config: {} as never,
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
    const [, runtime] = await createRuntime({ name: 'my-cli', version: '1.0.0' })

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
    const [, runtime] = await createRuntime({ name: 'my-cli', version: '1.0.0' })

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
    const [, runtime] = await createRuntime({ name: 'my-cli', version: '1.0.0' })

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
    const [, runtime] = await createRuntime({ name: 'my-cli', version: '2.0.0' })

    const execution = makeExecution({ commandPath: ['build', 'all'] })
    await runtime!.execute(execution)

    expect(mockedCreateContext).toHaveBeenCalledWith({
      args: validatedArgs,
      config: {},
      meta: {
        command: ['build', 'all'],
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
    const [, runtime] = await createRuntime({ name: 'my-cli', version: '1.0.0' })

    const execution = makeExecution({ middleware: commandMiddleware as never })
    await runtime!.execute(execution)

    expect(mockRunnerExecute).toHaveBeenCalledWith(
      expect.objectContaining({ middleware: commandMiddleware })
    )
  })

  it('should return ok result on successful execution', async () => {
    setupDefaults()

    const { createRuntime } = await import('./runtime.js')
    const [, runtime] = await createRuntime({ name: 'my-cli', version: '1.0.0' })

    const execution = makeExecution()
    const [execError] = await runtime!.execute(execution)

    expect(execError).toBeNull()
  })
})
