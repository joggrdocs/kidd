import type { Context } from 'kidd'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'), () => ({
  existsSync: vi.fn(),
}))

vi.mock(import('@kidd/config/loader'), () => ({
  loadConfig: vi.fn(),
}))

vi.mock(import('kidd'), () => ({
  autoload: vi.fn(),
  command: vi.fn((def) => def),
}))

const { existsSync } = await import('node:fs')
const { loadConfig } = await import('@kidd/config/loader')
const { autoload } = await import('kidd')
const mockedExistsSync = vi.mocked(existsSync)
const mockedLoadConfig = vi.mocked(loadConfig)
const mockedAutoload = vi.mocked(autoload)

function makeContext(): Context {
  return {
    args: {},
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
      trace: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['commands'], name: 'kidd', version: '0.0.0' },
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

describe('commands command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fail when commands directory not found', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(false)

    const mod = await import('./commands.js')

    await expect(mod.default.handler!(ctx)).rejects.toThrow('Commands directory not found')
  })

  it('should display "No commands found" when autoload returns empty map', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({})

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(ctx.output.write).toHaveBeenCalledWith('No commands found')
  })

  it('should render single command with description', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({
      deploy: { description: 'Deploy the app' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(ctx.output.raw).toHaveBeenCalledWith('└── deploy — Deploy the app\n')
  })

  it('should render command without description', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({
      build: {},
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(ctx.output.raw).toHaveBeenCalledWith('└── build\n')
  })

  it('should render multiple commands sorted alphabetically', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({
      add: { description: 'Add' },
      build: { description: 'Build' },
      deploy: { description: 'Deploy' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = [
      '├── add — Add',
      '├── build — Build',
      '└── deploy — Deploy',
    ].join('\n')
    expect(ctx.output.raw).toHaveBeenCalledWith(`${expected}\n`)
  })

  it('should use continuation connector for non-final entries', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({
      alpha: { description: 'First' },
      beta: { description: 'Second' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const output = vi.mocked(ctx.output.raw).mock.calls[0]![0] as string
    expect(output).toContain('├── alpha')
  })

  it('should use last-item connector for final entry', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({
      alpha: { description: 'First' },
      beta: { description: 'Second' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const output = vi.mocked(ctx.output.raw).mock.calls[0]![0] as string
    expect(output).toContain('└── beta')
  })

  it('should render nested subcommands with tree connectors', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({
      parent: {
        commands: {
          child1: { description: 'Child one' },
          child2: { description: 'Child two' },
        },
        description: 'Parent cmd',
      },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = [
      '└── parent — Parent cmd',
      '    ├── child1 — Child one',
      '    └── child2 — Child two',
    ].join('\n')
    expect(ctx.output.raw).toHaveBeenCalledWith(`${expected}\n`)
  })

  it('should handle deeply nested commands with three levels', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({
      root: {
        commands: {
          mid: {
            commands: {
              leaf: { description: 'Leaf' },
            },
            description: 'Middle',
          },
        },
        description: 'Root',
      },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = [
      '└── root — Root',
      '    └── mid — Middle',
      '        └── leaf — Leaf',
    ].join('\n')
    expect(ctx.output.raw).toHaveBeenCalledWith(`${expected}\n`)
  })

  it('should use config commands directory when available', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: { commands: 'src/cmds' } }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({})

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const autoloadArg = mockedAutoload.mock.calls[0]![0] as { dir: string }
    expect(autoloadArg.dir).toContain('src/cmds')
  })

  it('should default to commands directory when config has no commands field', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({})

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const autoloadArg = mockedAutoload.mock.calls[0]![0] as { dir: string }
    expect(autoloadArg.dir).toContain('commands')
  })

  it('should handle config load error gracefully with defaults', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([new Error('no config'), null] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({})

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    expect(ctx.output.write).toHaveBeenCalledWith('No commands found')
  })

  it('should render sibling and nested commands with correct prefixes', async () => {
    const ctx = makeContext()
    mockedLoadConfig.mockResolvedValue([null, { config: {} }] as never)
    mockedExistsSync.mockReturnValue(true)
    mockedAutoload.mockResolvedValue({
      alpha: {
        commands: {
          sub: { description: 'Sub' },
        },
        description: 'Alpha',
      },
      beta: { description: 'Beta' },
    } as never)

    const mod = await import('./commands.js')
    await mod.default.handler!(ctx)

    const expected = [
      '├── alpha — Alpha',
      '│   └── sub — Sub',
      '└── beta — Beta',
    ].join('\n')
    expect(ctx.output.raw).toHaveBeenCalledWith(`${expected}\n`)
  })
})
