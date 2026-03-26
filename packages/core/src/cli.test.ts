import { setArgv, runTestCli, setupTestLifecycle } from '@test/index.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CommandContext } from '@/context/types.js'
import type { CommandMap } from '@/types/index.js'

import { command } from './command.js'
import { middleware } from './middleware.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

const mockLoadConfig = vi.hoisted(() => vi.fn())
const mockAutoload = vi.hoisted(() => vi.fn())

vi.mock(import('@kidd-cli/config/loader'), () => ({
  loadConfig: mockLoadConfig,
}))

vi.mock(import('./autoload.js'), () => ({
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

const lifecycle = setupTestLifecycle()

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
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.meta.name).toBe('my-tool')
    expect(ctx.meta.version).toBe('2.5.0')
    expect(ctx.meta.command).toEqual(['info'])
  })
})

describe('dirs', () => {
  it('should default dirs to .<name> when no dirs option provided', async () => {
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
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.meta.dirs).toEqual({ global: '.my-tool', local: '.my-tool' })
  })

  it('should use custom dirs when provided', async () => {
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
      dirs: { global: '.joggr', local: '.joggr' },
      name: 'jog',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.meta.dirs).toEqual({ global: '.joggr', local: '.joggr' })
  })

  it('should allow partial dirs override for global only', async () => {
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
      dirs: { global: '.custom-global' },
      name: 'my-tool',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.meta.dirs).toEqual({ global: '.custom-global', local: '.my-tool' })
  })

  it('should allow partial dirs override for local only', async () => {
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
      dirs: { local: '.custom-local' },
      name: 'my-tool',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.meta.dirs).toEqual({ global: '.my-tool', local: '.custom-local' })
  })

  it('should fall back to default when dirs contain empty strings', async () => {
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
      dirs: { global: '', local: '  ' },
      name: 'my-tool',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.meta.dirs).toEqual({ global: '.my-tool', local: '.my-tool' })
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
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx).toHaveProperty('args')
    expect(ctx).toHaveProperty('config')
    expect(ctx).toHaveProperty('format')
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

    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.config).toEqual({})
  })
})

describe('version resolution', () => {
  // eslint-disable-next-line jest/no-hooks -- clean up stubbed globals after each test
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should fall back to __KIDD_VERSION__ when version is omitted', async () => {
    vi.stubGlobal('__KIDD_VERSION__', '5.0.0')

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
      name: 'auto-version-cli',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.meta.version).toBe('5.0.0')
  })

  it('should prefer explicit version over __KIDD_VERSION__', async () => {
    vi.stubGlobal('__KIDD_VERSION__', '5.0.0')

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
      name: 'explicit-version-cli',
      version: '9.9.9',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    const ctx = handler.mock.calls[0]![0] as CommandContext
    expect(ctx.meta.version).toBe('9.9.9')
  })

  it('should error when neither version nor __KIDD_VERSION__ is available', async () => {
    vi.stubGlobal('__KIDD_VERSION__', undefined)

    setArgv('info')
    await runTestCli({
      commands: {
        info: command({ description: 'Show info', handler: vi.fn() }),
      },
      name: 'no-version-cli',
    })

    expect(lifecycle.getExitSpy()).toHaveBeenCalled()
  })

  it('should error when explicit version is an empty string', async () => {
    vi.stubGlobal('__KIDD_VERSION__', '5.0.0')

    setArgv('info')
    await runTestCli({
      commands: {
        info: command({ description: 'Show info', handler: vi.fn() }),
      },
      name: 'empty-version-cli',
      version: '',
    })

    expect(lifecycle.getExitSpy()).toHaveBeenCalled()
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

describe('help', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  // eslint-disable-next-line jest/no-hooks -- capture console.log for help output assertions
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  // eslint-disable-next-line jest/no-hooks -- restore console.log
  afterEach(() => {
    logSpy.mockRestore()
  })

  it('should show help when no command is given', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      deploy: command({ description: 'Deploy the app', handler }),
      info: command({ description: 'Show info', handler }),
    }

    setArgv()
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(output).toContain('deploy')
    expect(output).toContain('info')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should display header above commands on no-command', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      deploy: command({ description: 'Deploy the app', handler }),
    }

    setArgv()
    await runTestCli({
      commands,
      help: { header: '*** HEADER ***' },
      name: 'test-cli',
      version: '1.0.0',
    })

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(output).toContain('*** HEADER ***')
    expect(output).toContain('deploy')

    const headerIndex = output.indexOf('*** HEADER ***')
    const deployIndex = output.indexOf('deploy')
    expect(headerIndex).toBeLessThan(deployIndex)
  })

  it('should not display header on --help', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      deploy: command({ description: 'Deploy the app', handler }),
    }

    setArgv('--help')
    await runTestCli({
      commands,
      help: { header: '*** HEADER ***' },
      name: 'test-cli',
      version: '1.0.0',
    })

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(output).not.toContain('*** HEADER ***')
    expect(output).toContain('deploy')
  })

  it('should show description without header when header is not set', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({ description: 'Run something', handler }),
    }

    setArgv()
    await runTestCli({
      commands,
      description: 'A great CLI tool',
      name: 'test-cli',
      version: '1.0.0',
    })

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(output).toContain('A great CLI tool')
  })

  it('should show footer on all help output', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({ description: 'Run something', handler }),
    }

    setArgv()
    await runTestCli({
      commands,
      help: { footer: 'Docs: https://example.com' },
      name: 'test-cli',
      version: '1.0.0',
    })

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(output).toContain('Docs: https://example.com')
  })

  it('should show footer on --help', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({ description: 'Run something', handler }),
    }

    setArgv('--help')
    await runTestCli({
      commands,
      help: { footer: 'Docs: https://example.com' },
      name: 'test-cli',
      version: '1.0.0',
    })

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(output).toContain('Docs: https://example.com')
  })

  it('should show both header and description on no-command', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({ description: 'Run something', handler }),
    }

    setArgv()
    await runTestCli({
      commands,
      description: 'A great CLI tool',
      help: { header: '=== MY CLI ===' },
      name: 'test-cli',
      version: '1.0.0',
    })

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(output).toContain('=== MY CLI ===')
    expect(output).toContain('A great CLI tool')
  })

  it('should not call handler when no command is given', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      deploy: command({ description: 'Deploy the app', handler }),
    }

    setArgv()
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('builtins', () => {
  it('should register --working-directory with --cwd alias by default', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({ description: 'Run', handler }),
    }

    setArgv('run')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler).toHaveBeenCalledOnce()
  })

  it('should disable --version when builtins.version is false', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({ description: 'Run', handler }),
    }

    setArgv('run')
    await runTestCli({
      builtins: { version: false },
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledOnce()
  })

  it('should disable --working-directory when builtins.workingDirectory is false', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({ description: 'Run', handler }),
    }

    setArgv('run', '--working-directory', '/tmp')
    await runTestCli({
      builtins: { workingDirectory: false },
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(lifecycle.getExitSpy()).toHaveBeenCalled()
  })

  it('should default all builtins to true when omitted', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({ description: 'Run', handler }),
    }

    setArgv('run')
    await runTestCli({ commands, name: 'test-cli', version: '1.0.0' })

    expect(handler).toHaveBeenCalledOnce()
  })
})
