import { setArgv, runTestCli, setupTestLifecycle } from '@test/core-utils.js'
import { describe, expect, it, vi } from 'vitest'

import type { Context } from '@/context/types.js'
import type { CommandMap } from '@/types.js'

import { command } from './command.js'
import { middleware } from './middleware.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

const mockLoadConfig = vi.hoisted(() => vi.fn())
const mockAutoload = vi.hoisted(() => vi.fn())

vi.mock(import('@kidd/config/loader'), () => ({
  loadConfig: mockLoadConfig,
}))

vi.mock(import('./autoloader.js'), () => ({
  autoload: mockAutoload,
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  confirm: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  multiselect: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  spinner: vi.fn(() => mockSpinnerInstance),
  text: vi.fn(),
}))

setupTestLifecycle()

describe('meta', () => {
  it('sets name and version on context meta', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      info: command({
        description: 'Show info',
        handler,
      }),
    }

    setArgv('info')
    await runTestCli({
      commands,
      name: 'my-tool',
      version: '2.5.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as Context
    expect(ctx.meta.name).toBe('my-tool')
    expect(ctx.meta.version).toBe('2.5.0')
    expect(ctx.meta.command).toEqual(['info'])
  })
})

describe('context properties', () => {
  it('provides all expected context properties', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as Context
    expect(ctx).toHaveProperty('args')
    expect(ctx).toHaveProperty('config')
    expect(ctx).toHaveProperty('logger')
    expect(ctx).toHaveProperty('prompts')
    expect(ctx).toHaveProperty('spinner')
    expect(ctx).toHaveProperty('output')
    expect(ctx).toHaveProperty('store')
    expect(ctx).toHaveProperty('fail')
    expect(ctx).toHaveProperty('meta')
  })

  it('provides empty config when no config option is given', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
      }),
    }

    setArgv('run')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    const ctx = handler.mock.calls[0]![0] as Context
    expect(ctx.config).toEqual({})
  })
})

describe('config-based autoloading', () => {
  it('should autoload from kidd.config.ts commands field when commands is omitted', async () => {
    const handler = vi.fn()
    const fakeCommands: CommandMap = {
      greet: command({ description: 'Greet', handler }),
    }

    mockLoadConfig.mockResolvedValue([
      null,
      {
        config: { commands: './custom/commands' },
        configFile: '/fake/kidd.config.ts',
      },
    ])
    mockAutoload.mockResolvedValue(fakeCommands)

    setArgv('greet')
    await runTestCli({ name: 'test', version: '1.0.0' })

    expect(mockLoadConfig).toHaveBeenCalledOnce()
    expect(mockAutoload).toHaveBeenCalledWith({ dir: './custom/commands' })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('should fall back to ./commands when config has no commands field', async () => {
    const handler = vi.fn()
    const fakeCommands: CommandMap = {
      ping: command({ description: 'Ping', handler }),
    }

    mockLoadConfig.mockResolvedValue([
      null,
      {
        config: {},
        configFile: '/fake/kidd.config.ts',
      },
    ])
    mockAutoload.mockResolvedValue(fakeCommands)

    setArgv('ping')
    await runTestCli({ name: 'test', version: '1.0.0' })

    expect(mockAutoload).toHaveBeenCalledWith({ dir: './commands' })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('should fall back to ./commands when loadConfig fails', async () => {
    const handler = vi.fn()
    const fakeCommands: CommandMap = {
      run: command({ description: 'Run', handler }),
    }

    mockLoadConfig.mockResolvedValue([new Error('Config not found'), null])
    mockAutoload.mockResolvedValue(fakeCommands)

    setArgv('run')
    await runTestCli({ name: 'test', version: '1.0.0' })

    expect(mockAutoload).toHaveBeenCalledWith({ dir: './commands' })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('should skip config loading when commands option is explicitly provided', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      hello: command({ description: 'Hello', handler }),
    }

    setArgv('hello')
    await runTestCli({ commands, name: 'test', version: '1.0.0' })

    expect(mockLoadConfig).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledOnce()
  })
})
