import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('font-list'), () => ({
  getFonts: vi.fn(async () => []),
}))

import { getFonts } from 'font-list'

import { clearDetectionCache, detectNerdFonts } from './detect.js'

describe('detectNerdFonts()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearDetectionCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should detect when a Nerd Font is installed', async () => {
    vi.mocked(getFonts).mockResolvedValue([
      'Arial',
      'JetBrainsMono Nerd Font',
      'Helvetica',
    ])

    const result = await detectNerdFonts()

    expect(result).toBeTruthy()
  })

  it('should return false when no Nerd Fonts are installed', async () => {
    vi.mocked(getFonts).mockResolvedValue([
      'Arial',
      'Helvetica',
      'Courier New',
    ])

    const result = await detectNerdFonts()

    expect(result).toBeFalsy()
  })

  it('should match case-insensitively', async () => {
    vi.mocked(getFonts).mockResolvedValue([
      'FiraCode NERD Font Mono',
    ])

    const result = await detectNerdFonts()

    expect(result).toBeTruthy()
  })

  it('should return false when getFonts throws', async () => {
    vi.mocked(getFonts).mockRejectedValue(new Error('failed'))

    const result = await detectNerdFonts()

    expect(result).toBeFalsy()
  })

  it('should cache results after first call', async () => {
    vi.mocked(getFonts).mockResolvedValue([
      'Hack Nerd Font',
    ])

    const first = await detectNerdFonts()
    const second = await detectNerdFonts()

    expect(first).toBe(second)
    expect(getFonts).toHaveBeenCalledTimes(1)
  })

  it('should pass disableQuoting option to getFonts', async () => {
    vi.mocked(getFonts).mockResolvedValue([])

    await detectNerdFonts()

    expect(getFonts).toHaveBeenCalledWith({ disableQuoting: true })
  })
})
