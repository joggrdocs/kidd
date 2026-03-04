import { createWritableCapture, runTestCli, setArgv, setupTestLifecycle } from '@test/core-utils.js'
import { describe, expect, it, vi } from 'vitest'

import { command } from '@/command.js'
import type { Context } from '@/context/types.js'
import type { CommandMap } from '@/types.js'

import greetCommand from '../../../../examples/simple/commands/greet.js'

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

setupTestLifecycle()

describe('examples/simple/commands/greet', () => {
  describe('handler', () => {
    it('should write greeting with provided name', () => {
      const { stream, output } = createWritableCapture()
      const ctx = createHandlerContext({ args: { name: 'Alice', shout: false }, output: stream })
      greetCommand.handler(ctx)
      expect(output()).toBe('Hello, Alice!\n')
    })

    it('should uppercase greeting when --shout', () => {
      const { stream, output } = createWritableCapture()
      const ctx = createHandlerContext({ args: { name: 'Bob', shout: true }, output: stream })
      greetCommand.handler(ctx)
      expect(output()).toBe('HELLO, BOB!\n')
    })
  })

  describe('pipeline', () => {
    it('should parse name arg from argv', async () => {
      const handler = vi.fn()
      const commands: CommandMap = {
        greet: command({ ...greetCommand, handler }),
      }

      setArgv('greet', '--name', 'Alice')
      await runTestCli({ commands, name: 'tasks', version: '1.0.0' })

      expect(handler).toHaveBeenCalledTimes(1)
      const ctx = handler.mock.calls[0]![0] as Context<{ name: string; shout: boolean }>
      expect(ctx.args.name).toBe('Alice')
    })

    it('should default shout to false', async () => {
      const handler = vi.fn()
      const commands: CommandMap = {
        greet: command({ ...greetCommand, handler }),
      }

      setArgv('greet', '--name', 'Alice')
      await runTestCli({ commands, name: 'tasks', version: '1.0.0' })

      const ctx = handler.mock.calls[0]![0] as Context<{ name: string; shout: boolean }>
      expect(ctx.args.shout).toBeFalsy()
    })

    it('should set meta.command to ["greet"]', async () => {
      const handler = vi.fn()
      const commands: CommandMap = {
        greet: command({ ...greetCommand, handler }),
      }

      setArgv('greet', '--name', 'Alice')
      await runTestCli({ commands, name: 'tasks', version: '1.0.0' })

      const ctx = handler.mock.calls[0]![0] as Context
      expect(ctx.meta.command).toEqual(['greet'])
    })
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { createContext } from '@/context/index.js'

function createHandlerContext(overrides: {
  readonly args: { readonly name: string; readonly shout: boolean }
  readonly output: NodeJS.WriteStream
}): Context<{ name: string; shout: boolean }> {
  return createContext({
    args: overrides.args,
    config: {},
    meta: { command: ['greet'], name: 'tasks', version: '1.0.0' },
    output: overrides.output,
  })
}
