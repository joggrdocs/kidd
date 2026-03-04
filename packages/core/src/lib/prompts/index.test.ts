import * as clack from '@clack/prompts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPromptUtils, createSpinner, prompts, spinner } from './index.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  multiselect: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  spinner: vi.fn(() => mockSpinnerInstance),
  text: vi.fn(),
}))

describe('createSpinner()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a spinner using clack.spinner', () => {
    createSpinner()
    expect(clack.spinner).toHaveBeenCalledWith()
  })

  describe('start', () => {
    it('delegates to the clack spinner start method', () => {
      const sp = createSpinner()
      sp.start('Loading...')
      expect(mockSpinnerInstance.start).toHaveBeenCalledWith('Loading...')
    })

    it('passes undefined when no message is provided', () => {
      const sp = createSpinner()
      sp.start()
      expect(mockSpinnerInstance.start).toHaveBeenCalledWith(undefined)
    })
  })

  describe('stop', () => {
    it('delegates to the clack spinner stop method', () => {
      const sp = createSpinner()
      sp.stop('Done!')
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith('Done!')
    })

    it('passes undefined when no message is provided', () => {
      const sp = createSpinner()
      sp.stop()
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(undefined)
    })
  })

  describe('message', () => {
    it('delegates to the clack spinner message method', () => {
      const sp = createSpinner()
      sp.message('Processing...')
      expect(mockSpinnerInstance.message).toHaveBeenCalledWith('Processing...')
    })
  })
})

describe('spinner (default export)', () => {
  it('is defined and has start, stop, and message methods', () => {
    expect(spinner).toBeDefined()
    expect(typeof spinner.start).toBe('function')
    expect(typeof spinner.stop).toBe('function')
    expect(typeof spinner.message).toBe('function')
    /* eslint-enable eslint-plugin-vitest/prefer-expect-type-of */
  })
})

describe('createPromptUtils() — select/confirm/text', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('select', () => {
    it('delegates to clack.select with opts', () => {
      const pu = createPromptUtils()
      const opts = { message: 'Pick one', options: [{ label: 'A', value: 'a' }] }

      pu.select(opts)
      expect(clack.select).toHaveBeenCalledWith(opts)
    })
  })

  describe('confirm', () => {
    it('delegates to clack.confirm with opts', () => {
      const pu = createPromptUtils()
      const opts = { message: 'Are you sure?' }

      pu.confirm(opts)
      expect(clack.confirm).toHaveBeenCalledWith(opts)
    })
  })

  describe('text', () => {
    it('delegates to clack.text with opts', () => {
      const pu = createPromptUtils()
      const opts = { message: 'Enter your name' }

      pu.text(opts)
      expect(clack.text).toHaveBeenCalledWith(opts)
    })
  })
})

describe('createPromptUtils() — multiselect/password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('multiselect', () => {
    it('delegates to clack.multiselect with opts', () => {
      const pu = createPromptUtils()
      const opts = {
        message: 'Pick many',
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
      }

      pu.multiselect(opts)
      expect(clack.multiselect).toHaveBeenCalledWith(opts)
    })
  })

  describe('password', () => {
    it('delegates to clack.password with opts', () => {
      const pu = createPromptUtils()
      const opts = { message: 'Enter password' }

      pu.password(opts)
      expect(clack.password).toHaveBeenCalledWith(opts)
    })
  })
})

describe('createPromptUtils() — cancel handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isCancel', () => {
    it('delegates to clack.isCancel and returns its result', () => {
      vi.mocked(clack.isCancel).mockReturnValue(true)
      const pu = createPromptUtils()

      const result = pu.isCancel(Symbol('cancel'))
      expect(clack.isCancel).toHaveBeenCalledWith(expect.anything())
      expect(result).toBeTruthy()
    })

    it('returns false for non-cancel values', () => {
      vi.mocked(clack.isCancel).mockReturnValue(false)
      const pu = createPromptUtils()

      const result = pu.isCancel('some value')
      expect(result).toBeFalsy()
    })
  })

  describe('cancel', () => {
    it('delegates to clack.cancel with the message', () => {
      const pu = createPromptUtils()

      pu.cancel('Operation cancelled')
      expect(clack.cancel).toHaveBeenCalledWith('Operation cancelled')
    })

    it('handles undefined message', () => {
      const pu = createPromptUtils()

      pu.cancel()
      expect(clack.cancel).toHaveBeenCalledWith(undefined)
    })
  })
})

describe('prompts (default export)', () => {
  it('is defined and has all expected methods', () => {
    expect(prompts).toBeDefined()
    expect(typeof prompts.select).toBe('function')
    expect(typeof prompts.confirm).toBe('function')
    expect(typeof prompts.text).toBe('function')
    expect(typeof prompts.multiselect).toBe('function')
    expect(typeof prompts.password).toBe('function')
    expect(typeof prompts.isCancel).toBe('function')
    expect(typeof prompts.cancel).toBe('function')
    /* eslint-enable eslint-plugin-vitest/prefer-expect-type-of */
  })
})
