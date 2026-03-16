import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'), () => ({
  exec: vi.fn((_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
    if (typeof cb === 'function') {
      cb(null, { stderr: '', stdout: '' })
    }
  }),
}))

import { exec } from 'node:child_process'

import { listSystemFonts } from './list-system-fonts.js'

describe('listSystemFonts()', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    vi.restoreAllMocks()
  })

  describe('darwin', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
    })

    it('should parse font families from system_profiler output', async () => {
      vi.mocked(exec).mockImplementation(
        (_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          if (typeof cb === 'function') {
            cb(null, {
              stderr: '',
              stdout: [
                'Fonts:',
                '',
                '    Arial:',
                '      Family: Arial',
                '      Full Name: Arial',
                '',
                '    JetBrainsMono Nerd Font:',
                '      Family: JetBrainsMono Nerd Font',
                '      Full Name: JetBrainsMono Nerd Font Regular',
                '',
              ].join('\n'),
            })
          }
          return undefined as never
        }
      )

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual(['Arial', 'JetBrainsMono Nerd Font'])
    })

    it('should invoke system_profiler SPFontsDataType', async () => {
      await listSystemFonts()

      expect(exec).toHaveBeenCalledWith(
        'system_profiler SPFontsDataType',
        expect.objectContaining({ timeout: 15_000 }),
        expect.any(Function)
      )
    })

    it('should return error result when system_profiler fails', async () => {
      vi.mocked(exec).mockImplementation(
        (_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          if (typeof cb === 'function') {
            cb(new Error('command failed'), null, null)
          }
          return undefined as never
        }
      )

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeInstanceOf(Error)
      expect(fonts).toBeNull()
    })

    it('should ignore non-Family lines from system_profiler', async () => {
      vi.mocked(exec).mockImplementation(
        (_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          if (typeof cb === 'function') {
            cb(null, {
              stderr: '',
              stdout: [
                '      Full Name: Arial Bold',
                '      Style: Bold',
                '      Family: Arial',
                '      Location: /System/Library/Fonts/Arial.ttf',
              ].join('\n'),
            })
          }
          return undefined as never
        }
      )

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual(['Arial'])
    })
  })

  describe('linux', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
    })

    it('should parse font families from fc-list output', async () => {
      vi.mocked(exec).mockImplementation(
        (_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          if (typeof cb === 'function') {
            cb(null, {
              stderr: '',
              stdout: 'Arial\nHelvetica\nJetBrainsMono Nerd Font\n',
            })
          }
          return undefined as never
        }
      )

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual(['Arial', 'Helvetica', 'JetBrainsMono Nerd Font'])
    })

    it('should invoke fc-list : family', async () => {
      await listSystemFonts()

      expect(exec).toHaveBeenCalledWith(
        'fc-list : family',
        expect.objectContaining({ timeout: 15_000 }),
        expect.any(Function)
      )
    })

    it('should return error result when fc-list fails', async () => {
      vi.mocked(exec).mockImplementation(
        (_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          if (typeof cb === 'function') {
            cb(new Error('command failed'), null, null)
          }
          return undefined as never
        }
      )

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeInstanceOf(Error)
      expect(fonts).toBeNull()
    })
  })

  describe('win32', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
    })

    it('should parse font families from powershell output', async () => {
      vi.mocked(exec).mockImplementation(
        (_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          if (typeof cb === 'function') {
            cb(null, {
              stderr: '',
              stdout: 'Arial\nCourier New\nHack Nerd Font\n',
            })
          }
          return undefined as never
        }
      )

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual(['Arial', 'Courier New', 'Hack Nerd Font'])
    })

    it('should handle Windows CRLF line endings', async () => {
      vi.mocked(exec).mockImplementation(
        (_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          if (typeof cb === 'function') {
            cb(null, {
              stderr: '',
              stdout: 'Arial\r\nCourier New\r\nHack Nerd Font\r\n',
            })
          }
          return undefined as never
        }
      )

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual(['Arial', 'Courier New', 'Hack Nerd Font'])
    })

    it('should return error result when powershell fails', async () => {
      vi.mocked(exec).mockImplementation(
        (_cmd: string, _opts: unknown, cb?: (...args: readonly unknown[]) => void) => {
          if (typeof cb === 'function') {
            cb(new Error('command failed'), null, null)
          }
          return undefined as never
        }
      )

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeInstanceOf(Error)
      expect(fonts).toBeNull()
    })

    it('should invoke powershell with -NoProfile', async () => {
      await listSystemFonts()

      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('powershell -NoProfile'),
        expect.objectContaining({ timeout: 15_000 }),
        expect.any(Function)
      )
    })
  })

  describe('unsupported platform', () => {
    it('should return success with empty array for unknown platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' })

      const [error, fonts] = await listSystemFonts()

      expect(error).toBeNull()
      expect(fonts).toEqual([])
    })
  })
})
