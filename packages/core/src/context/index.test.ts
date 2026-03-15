import * as clack from '@clack/prompts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createContext, createContextError, isContextError } from './index.js'
import type { ContextError } from './index.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

const mockLog = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  message: vi.fn(),
  step: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  log: mockLog,
  multiselect: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  spinner: vi.fn(() => mockSpinnerInstance),
  text: vi.fn(),
}))

function defaultOptions(): {
  args: { name: string; verbose: boolean }
  config: { debug: boolean }
  meta: { command: string[]; name: string; version: string }
} {
  return {
    args: { name: 'test', verbose: true },
    config: { debug: false },
    meta: { command: ['deploy', 'preview'], name: 'my-cli', version: '1.0.0' },
  }
}

describe('createContext()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Args, config
  // ---------------------------------------------------------------------------

  describe('args', () => {
    it('contains the provided args', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.args.verbose).toBeTruthy()
      expect(ctx.args.name).toBe('test')
    })
  })

  describe('config', () => {
    it('contains the provided config', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.config.debug).toBeFalsy()
    })
  })

  // ---------------------------------------------------------------------------
  // Meta
  // ---------------------------------------------------------------------------

  describe('meta', () => {
    it('has the correct name', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.meta.name).toBe('my-cli')
    })

    it('has the correct version', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.meta.version).toBe('1.0.0')
    })

    it('has the correct command path', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.meta.command).toEqual(['deploy', 'preview'])
    })
  })

  // ---------------------------------------------------------------------------
  // Logger
  // ---------------------------------------------------------------------------

  describe('logger', () => {
    it('uses the provided logger when given', () => {
      const customLogger = {
        check: vi.fn(),
        error: vi.fn(),
        finding: vi.fn(),
        info: vi.fn(),
        intro: vi.fn(),
        message: vi.fn(),
        newline: vi.fn(),
        note: vi.fn(),
        outro: vi.fn(),
        print: vi.fn(),
        step: vi.fn(),
        success: vi.fn(),
        tally: vi.fn(),
        warn: vi.fn(),
      }
      const ctx = createContext({ ...defaultOptions(), logger: customLogger })
      expect(ctx.logger).toBe(customLogger)
    })

    it('delegates error to clack log.error', () => {
      const ctx = createContext(defaultOptions())
      ctx.logger.error('test error')
      expect(mockLog.error).toHaveBeenCalledWith('test error')
    })

    it('delegates warn to clack log.warn', () => {
      const ctx = createContext(defaultOptions())
      ctx.logger.warn('test warn')
      expect(mockLog.warn).toHaveBeenCalledWith('test warn')
    })

    it('delegates info to clack log.info', () => {
      const ctx = createContext(defaultOptions())
      ctx.logger.info('test info')
      expect(mockLog.info).toHaveBeenCalledWith('test info')
    })

    it('delegates success to clack log.success', () => {
      const ctx = createContext(defaultOptions())
      ctx.logger.success('test success')
      expect(mockLog.success).toHaveBeenCalledWith('test success')
    })

    it('delegates step to clack log.step', () => {
      const ctx = createContext(defaultOptions())
      ctx.logger.step('test step')
      expect(mockLog.step).toHaveBeenCalledWith('test step')
    })
  })

  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------

  describe('store', () => {
    it('get() returns undefined for missing keys', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.store.get('nonexistent')).toBeUndefined()
    })

    it('set() and get() round-trip a value', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('foo', 'bar')
      expect(ctx.store.get('foo')).toBe('bar')
    })

    it('set() overwrites existing values', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('key', 'first')
      ctx.store.set('key', 'second')
      expect(ctx.store.get('key')).toBe('second')
    })

    it('has() returns false for missing keys', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.store.has('missing')).toBeFalsy()
    })

    it('has() returns true for existing keys', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('present', 42)
      expect(ctx.store.has('present')).toBeTruthy()
    })

    it('delete() removes a key and returns true', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('key', 'value')
      const result = ctx.store.delete('key')
      expect(result).toBeTruthy()
      expect(ctx.store.has('key')).toBeFalsy()
    })

    it('delete() returns false for non-existent keys', () => {
      const ctx = createContext(defaultOptions())
      expect(ctx.store.delete('nope')).toBeFalsy()
    })

    it('clear() removes all entries', () => {
      const ctx = createContext(defaultOptions())
      ctx.store.set('a', 1)
      ctx.store.set('b', 2)
      ctx.store.clear()
      expect(ctx.store.has('a')).toBeFalsy()
      expect(ctx.store.has('b')).toBeFalsy()
    })

    it('stores complex objects', () => {
      const ctx = createContext(defaultOptions())
      const obj = { nested: { data: [1, 2, 3] } }
      ctx.store.set('complex', obj)
      expect(ctx.store.get('complex')).toBe(obj)
    })

    it('each context has an independent store', () => {
      const ctx1 = createContext(defaultOptions())
      const ctx2 = createContext(defaultOptions())
      ctx1.store.set('key', 'from-ctx1')
      expect(ctx2.store.has('key')).toBeFalsy()
    })
  })

  // ---------------------------------------------------------------------------
  // Fail
  // ---------------------------------------------------------------------------

  describe('fail()', () => {
    it('throws a ContextError', () => {
      const ctx = createContext(defaultOptions())
      expect(() => ctx.fail('boom')).toThrow('boom')
      try {
        ctx.fail('boom')
      } catch (error) {
        expect(isContextError(error)).toBeTruthy()
      }
    })

    it('throws with the given message', () => {
      const ctx = createContext(defaultOptions())
      expect(() => ctx.fail('something broke')).toThrow('something broke')
    })

    it('sets default exitCode to 1', () => {
      const ctx = createContext(defaultOptions())
      try {
        ctx.fail('test')
      } catch (error) {
        expect(isContextError(error)).toBeTruthy()
        expect((error as ContextError).exitCode).toBe(1)
      }
    })

    it('accepts a custom exitCode', () => {
      const ctx = createContext(defaultOptions())
      try {
        ctx.fail('test', { exitCode: 42 })
      } catch (error) {
        expect((error as ContextError).exitCode).toBe(42)
      }
    })

    it('accepts a code string', () => {
      const ctx = createContext(defaultOptions())
      try {
        ctx.fail('test', { code: 'ERR_CUSTOM' })
      } catch (error) {
        expect((error as ContextError).code).toBe('ERR_CUSTOM')
      }
    })

    it('has code undefined when not provided', () => {
      const ctx = createContext(defaultOptions())
      try {
        ctx.fail('test')
      } catch (error) {
        expect((error as ContextError).code).toBeUndefined()
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Format
  // ---------------------------------------------------------------------------

  describe('format', () => {
    describe('json()', () => {
      it('serializes a string as JSON', () => {
        const ctx = createContext(defaultOptions())
        const result = ctx.format.json('hello')
        expect(result).toBe(`${JSON.stringify('hello', null, 2)}\n`)
      })

      it('serializes an object as pretty JSON', () => {
        const ctx = createContext(defaultOptions())
        const result = ctx.format.json({ key: 'value' })
        expect(result).toBe(`${JSON.stringify({ key: 'value' }, null, 2)}\n`)
      })
    })

    describe('table()', () => {
      it('formats a table with header and rows', () => {
        const ctx = createContext(defaultOptions())
        const result = ctx.format.table([
          { age: 30, name: 'Alice' },
          { age: 25, name: 'Bob' },
        ])
        const lines = result.split('\n')
        expect(lines[0]).toContain('name')
        expect(lines[0]).toContain('age')
        // Separator line
        expect(lines[1]).toMatch(/^-+/)
        // Data rows
        expect(lines[2]).toContain('Alice')
        expect(lines[3]).toContain('Bob')
      })

      it('returns empty string for empty arrays', () => {
        const ctx = createContext(defaultOptions())
        const result = ctx.format.table([])
        expect(result).toBe('')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Spinner
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Prompts
  // ---------------------------------------------------------------------------

  describe('prompts', () => {
    describe('confirm()', () => {
      it('returns the confirmed value', async () => {
        vi.mocked(clack.confirm).mockResolvedValue(true)
        vi.mocked(clack.isCancel).mockReturnValue(false)
        const ctx = createContext(defaultOptions())
        const result = await ctx.prompts.confirm({ message: 'Continue?' })
        expect(result).toBeTruthy()
      })

      it('throws ContextError on cancel', async () => {
        const cancelSymbol = Symbol('cancel')
        vi.mocked(clack.confirm).mockResolvedValue(cancelSymbol as unknown as boolean)
        vi.mocked(clack.isCancel).mockReturnValue(true)
        const ctx = createContext(defaultOptions())
        await expect(ctx.prompts.confirm({ message: 'Continue?' })).rejects.toThrow()
      })
    })

    describe('text()', () => {
      it('returns the entered text', async () => {
        vi.mocked(clack.text).mockResolvedValue('hello')
        vi.mocked(clack.isCancel).mockReturnValue(false)
        const ctx = createContext(defaultOptions())
        const result = await ctx.prompts.text({ message: 'Enter text' })
        expect(result).toBe('hello')
      })

      it('throws ContextError on cancel', async () => {
        const cancelSymbol = Symbol('cancel')
        vi.mocked(clack.text).mockResolvedValue(cancelSymbol as unknown as string)
        vi.mocked(clack.isCancel).mockReturnValue(true)
        const ctx = createContext(defaultOptions())
        await expect(ctx.prompts.text({ message: 'Enter text' })).rejects.toThrow()
      })
    })

    describe('select()', () => {
      it('returns the selected value', async () => {
        vi.mocked(clack.select).mockResolvedValue('option-a')
        vi.mocked(clack.isCancel).mockReturnValue(false)
        const ctx = createContext(defaultOptions())
        const result = await ctx.prompts.select({
          message: 'Pick one',
          options: [{ label: 'Option A', value: 'option-a' }],
        })
        expect(result).toBe('option-a')
      })

      it('throws ContextError on cancel', async () => {
        const cancelSymbol = Symbol('cancel')
        vi.mocked(clack.select).mockResolvedValue(cancelSymbol)
        vi.mocked(clack.isCancel).mockReturnValue(true)
        const ctx = createContext(defaultOptions())
        await expect(
          ctx.prompts.select({
            message: 'Pick one',
            options: [{ label: 'A', value: 'a' }],
          })
        ).rejects.toThrow()
      })
    })

    describe('multiselect()', () => {
      it('returns the selected values', async () => {
        vi.mocked(clack.multiselect).mockResolvedValue(['a', 'b'])
        vi.mocked(clack.isCancel).mockReturnValue(false)
        const ctx = createContext(defaultOptions())
        const result = await ctx.prompts.multiselect({
          message: 'Pick many',
          options: [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
          ],
        })
        expect(result).toEqual(['a', 'b'])
      })

      it('throws ContextError on cancel', async () => {
        const cancelSymbol = Symbol('cancel')
        vi.mocked(clack.multiselect).mockResolvedValue(cancelSymbol as unknown as string[])
        vi.mocked(clack.isCancel).mockReturnValue(true)
        const ctx = createContext(defaultOptions())
        await expect(
          ctx.prompts.multiselect({
            message: 'Pick many',
            options: [{ label: 'A', value: 'a' }],
          })
        ).rejects.toThrow()
      })
    })

    describe('password()', () => {
      it('returns the entered password', async () => {
        vi.mocked(clack.password).mockResolvedValue('secret123')
        vi.mocked(clack.isCancel).mockReturnValue(false)
        const ctx = createContext(defaultOptions())
        const result = await ctx.prompts.password({ message: 'Enter password' })
        expect(result).toBe('secret123')
      })

      it('throws ContextError on cancel', async () => {
        const cancelSymbol = Symbol('cancel')
        vi.mocked(clack.password).mockResolvedValue(cancelSymbol as unknown as string)
        vi.mocked(clack.isCancel).mockReturnValue(true)
        const ctx = createContext(defaultOptions())
        await expect(ctx.prompts.password({ message: 'Enter password' })).rejects.toThrow()
      })
    })

    it('calls clack.cancel when user cancels a prompt', async () => {
      const cancelSymbol = Symbol('cancel')
      vi.mocked(clack.text).mockResolvedValue(cancelSymbol as unknown as string)
      vi.mocked(clack.isCancel).mockReturnValue(true)
      const ctx = createContext(defaultOptions())
      try {
        await ctx.prompts.text({ message: 'test' })
      } catch {
        // Expected
      }
      expect(clack.cancel).toHaveBeenCalledWith('Operation cancelled.')
    })

    it('cancel error has code PROMPT_CANCELLED', async () => {
      const cancelSymbol = Symbol('cancel')
      vi.mocked(clack.text).mockResolvedValue(cancelSymbol as unknown as string)
      vi.mocked(clack.isCancel).mockReturnValue(true)
      const ctx = createContext(defaultOptions())
      try {
        await ctx.prompts.text({ message: 'test' })
        expect.unreachable('should have thrown')
      } catch (error) {
        expect(isContextError(error)).toBeTruthy()
        expect((error as ContextError).code).toBe('PROMPT_CANCELLED')
      }
    })
  })
})

describe(createContextError, () => {
  it('is an instance of Error', () => {
    const err = createContextError('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('has name "ContextError"', () => {
    const err = createContextError('test')
    expect(err.name).toBe('ContextError')
  })

  it('has default exitCode of 1', () => {
    const err = createContextError('test')
    expect(err.exitCode).toBe(1)
  })

  it('accepts a custom exitCode', () => {
    const err = createContextError('test', { exitCode: 2 })
    expect(err.exitCode).toBe(2)
  })

  it('accepts a code string', () => {
    const err = createContextError('test', { code: 'ERR_TEST' })
    expect(err.code).toBe('ERR_TEST')
  })

  it('has undefined code by default', () => {
    const err = createContextError('test')
    expect(err.code).toBeUndefined()
  })

  it('preserves the message', () => {
    const err = createContextError('something went wrong')
    expect(err.message).toBe('something went wrong')
  })
})
