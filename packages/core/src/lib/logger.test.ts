import * as clack from '@clack/prompts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCliLogger, cliLogger } from './logger.js'

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  intro: vi.fn(),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  note: vi.fn(),
  outro: vi.fn(),
}))

function createMockStream(): NodeJS.WriteStream {
  return { write: vi.fn() } as unknown as NodeJS.WriteStream
}

describe('createCliLogger()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('info', () => {
    it('delegates to clack.log.info with the message', () => {
      const logger = createCliLogger()

      logger.info('info message')
      expect(clack.log.info).toHaveBeenCalledWith('info message')
    })
  })

  describe('success', () => {
    it('delegates to clack.log.success with the message', () => {
      const logger = createCliLogger()

      logger.success('success message')
      expect(clack.log.success).toHaveBeenCalledWith('success message')
    })
  })

  describe('error', () => {
    it('delegates to clack.log.error with the message', () => {
      const logger = createCliLogger()

      logger.error('error message')
      expect(clack.log.error).toHaveBeenCalledWith('error message')
    })
  })

  describe('warn', () => {
    it('delegates to clack.log.warn with the message', () => {
      const logger = createCliLogger()

      logger.warn('warn message')
      expect(clack.log.warn).toHaveBeenCalledWith('warn message')
    })
  })

  describe('step', () => {
    it('delegates to clack.log.step with the message', () => {
      const logger = createCliLogger()

      logger.step('step message')
      expect(clack.log.step).toHaveBeenCalledWith('step message')
    })
  })

  describe('message', () => {
    it('delegates to clack.log.message with the message', () => {
      const logger = createCliLogger()

      logger.message('generic message')
      expect(clack.log.message).toHaveBeenCalledWith('generic message', undefined)
    })

    it('passes additional options like symbol to clack.log.message', () => {
      const logger = createCliLogger()

      logger.message('custom symbol message', { symbol: '>' })
      expect(clack.log.message).toHaveBeenCalledWith('custom symbol message', {
        symbol: '>',
      })
    })
  })

  describe('intro', () => {
    it('delegates to clack.intro with the title', () => {
      const logger = createCliLogger()

      logger.intro('My CLI')
      expect(clack.intro).toHaveBeenCalledWith('My CLI')
    })

    it('handles undefined title', () => {
      const logger = createCliLogger()

      logger.intro()
      expect(clack.intro).toHaveBeenCalledWith(undefined)
    })
  })

  describe('outro', () => {
    it('delegates to clack.outro with the message', () => {
      const logger = createCliLogger()

      logger.outro('Goodbye!')
      expect(clack.outro).toHaveBeenCalledWith('Goodbye!')
    })

    it('handles undefined message', () => {
      const logger = createCliLogger()

      logger.outro()
      expect(clack.outro).toHaveBeenCalledWith(undefined)
    })
  })

  describe('note', () => {
    it('delegates to clack.note with message and title', () => {
      const logger = createCliLogger()

      logger.note('note body', 'Note Title')
      expect(clack.note).toHaveBeenCalledWith('note body', 'Note Title')
    })

    it('handles undefined message and title', () => {
      const logger = createCliLogger()

      logger.note()
      expect(clack.note).toHaveBeenCalledWith(undefined, undefined)
    })
  })

  describe('newline', () => {
    it('writes a newline character to the output stream', () => {
      const stream = createMockStream()
      const logger = createCliLogger({ output: stream })

      logger.newline()
      expect(stream.write).toHaveBeenCalledWith('\n')
    })
  })

  describe('print', () => {
    it('writes text followed by a newline to the output stream', () => {
      const stream = createMockStream()
      const logger = createCliLogger({ output: stream })

      logger.print('hello world')
      expect(stream.write).toHaveBeenCalledWith('hello world\n')
    })

    it('writes empty string with newline when given empty text', () => {
      const stream = createMockStream()
      const logger = createCliLogger({ output: stream })

      logger.print('')
      expect(stream.write).toHaveBeenCalledWith('\n')
    })
  })
})

describe('cliLogger (default export)', () => {
  it('should delegate info through the default instance', () => {
    cliLogger.info('default info')
    expect(clack.log.info).toHaveBeenCalledWith('default info')
  })
})
