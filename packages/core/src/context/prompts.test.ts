import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

vi.mock(import('@clack/prompts'), () => ({
  confirm: vi.fn(),
  multiselect: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
  autocomplete: vi.fn(),
  autocompleteMultiselect: vi.fn(),
  groupMultiselect: vi.fn(),
  selectKey: vi.fn(),
  path: vi.fn(),
  group: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(),
}))

import * as clack from '@clack/prompts'

import { isContextError } from './error.js'
import { createContextPrompts } from './prompts.js'

beforeEach(() => {
  vi.clearAllMocks()
  ;(clack.isCancel as Mock).mockReturnValue(false)
})

describe('createContextPrompts()', () => {
  describe('confirm()', () => {
    it('should return the resolved value from clack', async () => {
      ;(clack.confirm as Mock).mockResolvedValue(true)
      const prompts = createContextPrompts()
      const result = await prompts.confirm({ message: 'Continue?' })
      expect(result).toBe(true)
    })

    it('should throw ContextError when user cancels', async () => {
      ;(clack.confirm as Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as Mock).mockReturnValue(true)
      const prompts = createContextPrompts()
      try {
        await prompts.confirm({ message: 'Continue?' })
        expect.fail('Expected a ContextError to be thrown')
      } catch (error: unknown) {
        expect(isContextError(error)).toBe(true)
      }
    })
  })

  describe('text()', () => {
    it('should return the resolved string from clack', async () => {
      ;(clack.text as Mock).mockResolvedValue('hello')
      const prompts = createContextPrompts()
      const result = await prompts.text({ message: 'Enter text:' })
      expect(result).toBe('hello')
    })

    it('should throw ContextError when user cancels', async () => {
      ;(clack.text as Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as Mock).mockReturnValue(true)
      const prompts = createContextPrompts()
      try {
        await prompts.text({ message: 'Enter text:' })
        expect.fail('Expected a ContextError to be thrown')
      } catch (error: unknown) {
        expect(isContextError(error)).toBe(true)
      }
    })
  })

  describe('select()', () => {
    it('should return the resolved value from clack', async () => {
      ;(clack.select as Mock).mockResolvedValue('option-a')
      const prompts = createContextPrompts()
      const result = await prompts.select({
        message: 'Pick one:',
        options: [{ value: 'option-a', label: 'Option A' }],
      })
      expect(result).toBe('option-a')
    })
  })

  describe('password()', () => {
    it('should return the resolved value from clack', async () => {
      ;(clack.password as Mock).mockResolvedValue('secret')
      const prompts = createContextPrompts()
      const result = await prompts.password({ message: 'Enter password:' })
      expect(result).toBe('secret')
    })
  })

  describe('multiselect()', () => {
    it('should return the resolved values from clack', async () => {
      ;(clack.multiselect as Mock).mockResolvedValue(['a', 'b'])
      const prompts = createContextPrompts()
      const result = await prompts.multiselect({
        message: 'Pick many:',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      })
      expect(result).toEqual(['a', 'b'])
    })
  })

  describe('autocomplete()', () => {
    it('should return the resolved value from clack', async () => {
      ;(clack.autocomplete as Mock).mockResolvedValue('match')
      const prompts = createContextPrompts()
      const result = await prompts.autocomplete({
        message: 'Search:',
        options: [{ value: 'match', label: 'Match' }],
      })
      expect(result).toBe('match')
    })
  })

  describe('autocompleteMultiselect()', () => {
    it('should return the resolved values from clack', async () => {
      ;(clack.autocompleteMultiselect as Mock).mockResolvedValue(['x', 'y'])
      const prompts = createContextPrompts()
      const result = await prompts.autocompleteMultiselect({
        message: 'Search many:',
        options: [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
        ],
      })
      expect(result).toEqual(['x', 'y'])
    })
  })

  describe('groupMultiselect()', () => {
    it('should return the resolved values from clack', async () => {
      ;(clack.groupMultiselect as Mock).mockResolvedValue(['g1'])
      const prompts = createContextPrompts()
      const result = await prompts.groupMultiselect({
        message: 'Pick from groups:',
        options: { group1: [{ value: 'g1', label: 'G1' }] },
      })
      expect(result).toEqual(['g1'])
    })
  })

  describe('selectKey()', () => {
    it('should return the resolved value from clack', async () => {
      ;(clack.selectKey as Mock).mockResolvedValue('y')
      const prompts = createContextPrompts()
      const result = await prompts.selectKey({
        message: 'Press a key:',
        options: [{ value: 'y', label: 'Yes' }],
      })
      expect(result).toBe('y')
    })
  })

  describe('path()', () => {
    it('should return the resolved value from clack', async () => {
      ;(clack.path as Mock).mockResolvedValue('/home/user/file.txt')
      const prompts = createContextPrompts()
      const result = await prompts.path({ message: 'Select path:' })
      expect(result).toBe('/home/user/file.txt')
    })
  })

  describe('group()', () => {
    it('should return the resolved group results from clack', async () => {
      const groupResult = { name: 'Alice', age: 30 }
      ;(clack.group as Mock).mockResolvedValue(groupResult)
      const prompts = createContextPrompts()
      const result = await prompts.group({
        name: async () => 'Alice',
        age: async () => 30,
      })
      expect(result).toEqual(groupResult)
    })
  })

  describe('defaults', () => {
    it('should spread defaults into clack calls', async () => {
      ;(clack.confirm as Mock).mockResolvedValue(true)
      const prompts = createContextPrompts({ defaults: { guide: true } })
      await prompts.confirm({ message: 'Continue?' })
      expect(clack.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ withGuide: true, message: 'Continue?' })
      )
    })
  })
})
