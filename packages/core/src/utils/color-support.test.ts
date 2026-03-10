import { release } from 'node:os'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { supportsColor } from './color-support.js'

vi.mock(import('node:os'), async () => ({
  release: vi.fn(() => '5.10.0'),
}))

const ORIGINAL_PLATFORM = process.platform

const TTY_STREAM = { isTTY: true } as const
const NON_TTY_STREAM = { isTTY: false } as const

/**
 * Save the original values of all color-related env vars so they
 * can be restored after each test.
 * @private
 */
const ORIGINAL_ENV: Readonly<Record<string, string | undefined>> = Object.freeze({
  CI: process.env.CI,
  COLORTERM: process.env.COLORTERM,
  FORCE_COLOR: process.env.FORCE_COLOR,
  NO_COLOR: process.env.NO_COLOR,
  TERM: process.env.TERM,
  TERM_PROGRAM: process.env.TERM_PROGRAM,
  TERM_PROGRAM_VERSION: process.env.TERM_PROGRAM_VERSION,
})

/**
 * Restore a single env var to its original value.
 * @private
 */
function restoreEnvKey(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}

/**
 * Remove all color-related env vars for a clean test slate.
 * @private
 */
function cleanColorEnv(): void {
  delete process.env.NO_COLOR
  delete process.env.FORCE_COLOR
  delete process.env.CI
  delete process.env.COLORTERM
  delete process.env.TERM
  delete process.env.TERM_PROGRAM
  delete process.env.TERM_PROGRAM_VERSION
}

/**
 * Restore all color-related env vars to their original values.
 * @private
 */
function restoreOriginalEnv(): void {
  restoreEnvKey('NO_COLOR', ORIGINAL_ENV.NO_COLOR)
  restoreEnvKey('FORCE_COLOR', ORIGINAL_ENV.FORCE_COLOR)
  restoreEnvKey('CI', ORIGINAL_ENV.CI)
  restoreEnvKey('COLORTERM', ORIGINAL_ENV.COLORTERM)
  restoreEnvKey('TERM', ORIGINAL_ENV.TERM)
  restoreEnvKey('TERM_PROGRAM', ORIGINAL_ENV.TERM_PROGRAM)
  restoreEnvKey('TERM_PROGRAM_VERSION', ORIGINAL_ENV.TERM_PROGRAM_VERSION)
}

beforeEach(() => {
  cleanColorEnv()
  Object.defineProperty(process, 'platform', { value: 'linux' })
})

afterEach(() => {
  restoreOriginalEnv()
  vi.restoreAllMocks()
  Object.defineProperty(process, 'platform', { value: ORIGINAL_PLATFORM })
})

describe('supportsColor()', () => {
  describe('FORCE_COLOR', () => {
    it('should return level 0 when FORCE_COLOR is "0"', () => {
      process.env.FORCE_COLOR = '0'
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(0)
      expect(result.hasBasic).toBeFalsy()
    })

    it('should return level 1 when FORCE_COLOR is "1"', () => {
      process.env.FORCE_COLOR = '1'
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(1)
      expect(result.hasBasic).toBeTruthy()
    })

    it('should return level 2 when FORCE_COLOR is "2"', () => {
      process.env.FORCE_COLOR = '2'
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(2)
      expect(result.has256).toBeTruthy()
    })

    it('should return level 3 when FORCE_COLOR is "3"', () => {
      process.env.FORCE_COLOR = '3'
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(3)
      expect(result.has16m).toBeTruthy()
    })

    it('should return level 1 when FORCE_COLOR is "true"', () => {
      process.env.FORCE_COLOR = 'true'
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(1)
    })

    it('should return level 0 when FORCE_COLOR is "false"', () => {
      process.env.FORCE_COLOR = 'false'
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(0)
    })

    it('should return level 1 when FORCE_COLOR is empty string', () => {
      process.env.FORCE_COLOR = ''
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(1)
    })

    it('should override NO_COLOR when both are set', () => {
      process.env.NO_COLOR = ''
      process.env.FORCE_COLOR = '1'
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(1)
    })
  })

  describe('NO_COLOR', () => {
    it('should return level 0 when NO_COLOR is set', () => {
      process.env.NO_COLOR = ''
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(0)
      expect(result.hasBasic).toBeFalsy()
    })

    it('should return level 0 when NO_COLOR has a value', () => {
      process.env.NO_COLOR = '1'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(0)
    })
  })

  describe('non-TTY streams', () => {
    it('should return level 0 for non-TTY without CI', () => {
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(0)
    })

    it('should return level 1 for non-TTY in CI', () => {
      process.env.CI = 'true'
      const result = supportsColor(NON_TTY_STREAM)
      expect(result.level).toBe(1)
    })

    it('should return level 0 for stream with isTTY undefined', () => {
      const result = supportsColor({})
      expect(result.level).toBe(0)
    })
  })

  describe('dumb terminal', () => {
    it('should return level 0 when TERM is "dumb"', () => {
      process.env.TERM = 'dumb'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(0)
    })
  })

  describe('Windows', () => {
    it('should return level 3 for Windows 10 build 14931+', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      vi.mocked(release).mockReturnValue('10.0.14931')
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(3)
    })

    it('should return level 2 for Windows 10 build 10586+', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      vi.mocked(release).mockReturnValue('10.0.10586')
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(2)
    })

    it('should return level 1 for older Windows 10 builds', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      vi.mocked(release).mockReturnValue('10.0.10240')
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(1)
    })

    it('should return level 1 for pre-Windows 10', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      vi.mocked(release).mockReturnValue('6.3.9600')
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(1)
    })

    it('should return level 3 for Windows 11', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      vi.mocked(release).mockReturnValue('10.0.22000')
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(3)
    })

    it('should return level 1 for unparseable release string', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      vi.mocked(release).mockReturnValue('unknown')
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(1)
    })
  })

  describe('COLORTERM', () => {
    it('should return level 3 when COLORTERM is "truecolor"', () => {
      process.env.COLORTERM = 'truecolor'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(3)
    })

    it('should return level 3 when COLORTERM is "24bit"', () => {
      process.env.COLORTERM = '24bit'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(3)
    })
  })

  describe('TERM_PROGRAM', () => {
    it('should return level 3 for iTerm.app version 3+', () => {
      process.env.TERM_PROGRAM = 'iTerm.app'
      process.env.TERM_PROGRAM_VERSION = '3.4.23'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(3)
    })

    it('should return level 2 for iTerm.app version 2', () => {
      process.env.TERM_PROGRAM = 'iTerm.app'
      process.env.TERM_PROGRAM_VERSION = '2.9.3'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(2)
    })

    it('should return level 2 for iTerm.app without version', () => {
      process.env.TERM_PROGRAM = 'iTerm.app'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(2)
    })

    it('should return level 2 for Apple_Terminal', () => {
      process.env.TERM_PROGRAM = 'Apple_Terminal'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(2)
    })
  })

  describe('TERM', () => {
    it('should return level 2 for xterm-256color', () => {
      process.env.TERM = 'xterm-256color'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(2)
    })

    it('should return level 2 for screen-256color', () => {
      process.env.TERM = 'screen-256color'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(2)
    })

    it('should return level 1 for xterm', () => {
      process.env.TERM = 'xterm'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(1)
    })

    it('should return level 1 for screen', () => {
      process.env.TERM = 'screen'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(1)
    })

    it('should return level 0 for unknown TERM', () => {
      process.env.TERM = 'unknown-terminal'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(0)
    })

    it('should return level 1 for COLORTERM with no TERM', () => {
      process.env.COLORTERM = 'yes'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(1)
    })

    it('should return level 1 for COLORTERM with unknown TERM', () => {
      process.env.TERM = 'unknown-terminal'
      process.env.COLORTERM = 'yes'
      const result = supportsColor(TTY_STREAM)
      expect(result.level).toBe(1)
    })
  })

  describe('ColorSupport object', () => {
    it('should return a frozen object', () => {
      process.env.FORCE_COLOR = '3'
      const result = supportsColor(TTY_STREAM)
      expect(Object.isFrozen(result)).toBeTruthy()
    })

    it('should set all flags correctly for level 3', () => {
      process.env.FORCE_COLOR = '3'
      const result = supportsColor(TTY_STREAM)
      expect(result).toEqual({
        has16m: true,
        has256: true,
        hasBasic: true,
        level: 3,
      })
    })

    it('should set all flags correctly for level 2', () => {
      process.env.FORCE_COLOR = '2'
      const result = supportsColor(TTY_STREAM)
      expect(result).toEqual({
        has16m: false,
        has256: true,
        hasBasic: true,
        level: 2,
      })
    })

    it('should set all flags correctly for level 1', () => {
      process.env.FORCE_COLOR = '1'
      const result = supportsColor(TTY_STREAM)
      expect(result).toEqual({
        has16m: false,
        has256: false,
        hasBasic: true,
        level: 1,
      })
    })

    it('should set all flags correctly for level 0', () => {
      process.env.FORCE_COLOR = '0'
      const result = supportsColor(TTY_STREAM)
      expect(result).toEqual({
        has16m: false,
        has256: false,
        hasBasic: false,
        level: 0,
      })
    })
  })
})
