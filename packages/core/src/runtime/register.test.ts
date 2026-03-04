import { runTestCli, setArgv, setupTestLifecycle } from '@test/core-utils.js'
import { describe, expect, it, vi } from 'vitest'

import { command } from '@/command.js'
import type { CommandMap } from '@/types.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
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

const { getExitSpy } = setupTestLifecycle()

describe('command registration and execution', () => {
  it('executes a simple command handler', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      greet: command({
        description: 'Greet someone',
        handler,
      }),
    }

    setArgv('greet')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          command: ['greet'],
          name: 'test-cli',
          version: '1.0.0',
        }),
      })
    )
  })

  it('executes nested subcommands', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      deploy: command({
        commands: {
          preview: command({
            description: 'Deploy to preview',
            handler,
          }),
        },
        description: 'Deploy commands',
      }),
    }

    setArgv('deploy', 'preview')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          command: ['deploy', 'preview'],
        }),
      })
    )
  })

  it('handles command with no handler gracefully', async () => {
    const commands: CommandMap = {
      noop: command({
        description: 'Does nothing',
      }),
    }

    setArgv('noop')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    // Should not exit with error
    expect(getExitSpy()).not.toHaveBeenCalled()
  })
})

describe('AutoloadMarker handling', () => {
  it('skips AutoloadMarker entries in command map', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      run: command({
        description: 'Run',
        handler,
      }),
    }

    // Inject an autoload marker alongside a real command
    const commandsWithAutoload = {
      ...commands,
      __autoload: { dir: './commands' },
    } as unknown as CommandMap

    setArgv('run')
    await runTestCli({
      commands: commandsWithAutoload,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('skips nested AutoloadMarker entries', async () => {
    const handler = vi.fn()
    const commands: CommandMap = {
      parent: command({
        commands: {
          __autoload: { dir: './sub' } as unknown as ReturnType<typeof command>,
          child: command({
            description: 'Child',
            handler,
          }),
        },
        description: 'Parent',
      }),
    }

    setArgv('parent', 'child')
    await runTestCli({
      commands,
      name: 'test-cli',
      version: '1.0.0',
    })

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
