import { TAG, hasTag } from '@kidd/utils/tag'
import { describe, expect, it } from 'vitest'

import { command } from './command.js'

describe('command()', () => {
  it('returns an object tagged as Command', () => {
    const cmd = command({})
    expect(hasTag(cmd, 'Command')).toBeTruthy()
  })

  it('preserves the description', () => {
    const cmd = command({ description: 'Deploy the app' })
    expect(cmd.description).toBe('Deploy the app')
  })

  it('preserves yargs-style args', () => {
    const args = {
      name: { description: 'Name', required: true, type: 'string' as const },
      verbose: { default: false, type: 'boolean' as const },
    }
    const cmd = command({ args })
    expect(cmd.args).toBe(args)
  })

  it('preserves the handler function', () => {
    async function handler(): Promise<void> {}
    const cmd = command({ handler })
    expect(cmd.handler).toBe(handler)
  })

  it('preserves nested commands', () => {
    const sub = command({ description: 'sub' })
    const parent = command({
      commands: { sub },
      description: 'parent',
    })
    expect(parent.commands).toBeDefined()
    expect(hasTag(parent.commands!['sub'], 'Command')).toBeTruthy()
  })

  it('works with no options (empty def)', () => {
    const cmd = command({})
    expect(cmd[TAG]).toBe('Command')
    expect(cmd.description).toBeUndefined()
    expect(cmd.args).toBeUndefined()
    expect(cmd.handler).toBeUndefined()
    expect(cmd.commands).toBeUndefined()
  })

  it('works with all options provided', () => {
    async function handler(): Promise<void> {}
    const sub = command({ description: 'child' })
    const args = { port: { type: 'number' as const } }

    const cmd = command({
      args,
      commands: { sub },
      description: 'full command',
      handler,
    })

    expect(cmd[TAG]).toBe('Command')
    expect(cmd.description).toBe('full command')
    expect(cmd.args).toBe(args)
    expect(cmd.handler).toBe(handler)
    expect(cmd.commands!['sub']).toBe(sub)
  })
})
