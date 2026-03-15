import { runTestCli, setArgv, setupTestLifecycle } from '@test/core-utils.js'
import { describe, expect, it, vi } from 'vitest'

import { command } from '@/command.js'
import { createContext } from '@/context/index.js'
import type { Context } from '@/context/types.js'
import { createCliLogger } from '@/lib/logger.js'
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
      const { ctx, output } = createGreetContext({ args: { name: 'Alice', shout: false } })
      greetCommand.handler(ctx)
      expect(output()).toBe('Hello, Alice!\n')
    })

    it('should uppercase greeting when --shout', () => {
      const { ctx, output } = createGreetContext({ args: { name: 'Bob', shout: true } })
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

import { Writable } from 'node:stream'

function createGreetContext(overrides: {
  readonly args: { readonly name: string; readonly shout: boolean }
}): { ctx: Context<{ name: string; shout: boolean }>; output: () => string } {
  let data = ''
  const stream = new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void): void {
      data += chunk.toString()
      callback()
    },
  }) as unknown as NodeJS.WriteStream

  const logger = createCliLogger({ output: stream })

  const ctx = createContext({
    args: overrides.args,
    config: {},
    logger,
    meta: { command: ['greet'], name: 'tasks', version: '1.0.0' },
  })

  return { ctx, output: () => data }
}
