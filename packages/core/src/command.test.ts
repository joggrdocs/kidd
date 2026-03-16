import { TAG, hasTag } from '@kidd-cli/utils/tag'
import { describe, expect, it } from 'vitest'

import { command, isCommandsConfig } from './command.js'

describe('command()', () => {
  it('returns an object tagged as Command', () => {
    const cmd = command({})
    expect(hasTag(cmd, 'Command')).toBeTruthy()
  })

  it('preserves the description', () => {
    const cmd = command({ description: 'Deploy the app' })
    expect(cmd.description).toBe('Deploy the app')
  })

  it('preserves yargs-style options', () => {
    const options = {
      name: { description: 'Name', required: true, type: 'string' as const },
      verbose: { default: false, type: 'boolean' as const },
    }
    const cmd = command({ options })
    expect(cmd.options).toBe(options)
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
    expect(cmd.options).toBeUndefined()
    expect(cmd.handler).toBeUndefined()
    expect(cmd.commands).toBeUndefined()
  })

  it('works with all options provided', () => {
    async function handler(): Promise<void> {}
    const sub = command({ description: 'child' })
    const options = { port: { type: 'number' as const } }

    const cmd = command({
      commands: { sub },
      description: 'full command',
      handler,
      options,
    })

    expect(cmd[TAG]).toBe('Command')
    expect(cmd.description).toBe('full command')
    expect(cmd.options).toBe(options)
    expect(cmd.handler).toBe(handler)
    expect(cmd.commands!['sub']).toBe(sub)
  })

  it('normalizes CommandsConfig with commands and order into flat fields', () => {
    const sub = command({ description: 'child' })
    const parent = command({
      commands: {
        commands: { sub },
        order: ['sub'],
      },
      description: 'parent',
    })

    expect(parent[TAG]).toBe('Command')
    expect(parent.commands).toBeDefined()
    expect(hasTag(parent.commands!['sub'], 'Command')).toBeTruthy()
    expect(parent.order).toEqual(['sub'])
  })

  it('normalizes CommandsConfig with order only (no inner commands)', () => {
    const cmd = command({
      commands: {
        order: ['production', 'preview'],
      },
      description: 'Deploy',
    })

    expect(cmd[TAG]).toBe('Command')
    expect(cmd.commands).toBeUndefined()
    expect(cmd.order).toEqual(['production', 'preview'])
  })

  it('normalizes CommandsConfig with path and order', () => {
    const cmd = command({
      commands: {
        order: ['a', 'b'],
        path: './src/commands',
      },
      description: 'Root',
    })

    expect(cmd[TAG]).toBe('Command')
    expect(cmd.order).toEqual(['a', 'b'])
    // Path is not stored on the flat Command — it is resolved at the cli() level
    expect(cmd.commands).toBeUndefined()
  })
})

describe('isCommandsConfig()', () => {
  it('returns true for an object with order array', () => {
    expect(isCommandsConfig({ order: ['a', 'b'] })).toBeTruthy()
  })

  it('returns true for an object with path string', () => {
    expect(isCommandsConfig({ path: './commands' })).toBeTruthy()
  })

  it('returns true for an object with both path and order', () => {
    expect(isCommandsConfig({ order: ['a'], path: './commands' })).toBeTruthy()
  })

  it('returns true for an object with commands and order', () => {
    const sub = command({ description: 'sub' })
    expect(isCommandsConfig({ commands: { sub }, order: ['sub'] })).toBeTruthy()
  })

  it('returns false for a plain CommandMap (tagged Command values)', () => {
    const sub = command({ description: 'sub' })
    expect(isCommandsConfig({ sub })).toBeFalsy()
  })

  it('returns false for null', () => {
    expect(isCommandsConfig(null)).toBeFalsy()
  })

  it('returns false for a string', () => {
    expect(isCommandsConfig('./commands')).toBeFalsy()
  })

  it('returns false for a Promise', () => {
    expect(isCommandsConfig(Promise.resolve({}))).toBeFalsy()
  })

  it('returns false for an empty object', () => {
    expect(isCommandsConfig({})).toBeFalsy()
  })

  it('returns false when order is not an array', () => {
    expect(isCommandsConfig({ order: 'not-an-array' })).toBeFalsy()
  })

  it('returns false when path is not a string', () => {
    expect(isCommandsConfig({ path: 42 })).toBeFalsy()
  })
})
