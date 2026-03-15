import { hasTag } from '@kidd-cli/utils/tag'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { icons } from './icons.js'

vi.mock(import('./detect.js'), () => ({
  detectNerdFonts: vi.fn(async () => false),
}))

vi.mock(import('./install.js'), () => ({
  installNerdFont: vi.fn(async () => [null, false] as const),
}))

import { detectNerdFonts } from './detect.js'
import { installNerdFont } from './install.js'
import type { IconsContext } from './types.js'

function createMockCtx() {
  const store = new Map()

  return {
    args: {},
    config: {},
    fail: vi.fn((): never => {
      throw new Error('fail')
    }),
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      message: vi.fn(),
      step: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['test'], name: 'test-cli', version: '1.0.0' },
    output: { markdown: vi.fn(), raw: vi.fn(), table: vi.fn(), write: vi.fn() },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() },
    store: {
      clear: () => store.clear(),
      delete: (key: string) => store.delete(key),
      get: (key: string) => store.get(key),
      has: (key: string) => store.has(key),
      set: (key: string, value: unknown) => store.set(key, value),
    },
  }
}

describe('icons()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a Middleware tagged object', () => {
    const mw = icons()

    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should decorate ctx.icons as a callable function', async () => {
    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    expect(typeof iconsCtx).toBe('function')
  })

  it('should resolve icon via ctx.icons() shorthand', async () => {
    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    const result = iconsCtx('branch')
    expect(result).toBeTruthy()
  })

  it('should resolve icon via ctx.icons.get()', async () => {
    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    expect(iconsCtx.get('branch')).toBe(iconsCtx('branch'))
  })

  it('should return emoji when nerd fonts are not installed', async () => {
    vi.mocked(detectNerdFonts).mockResolvedValue(false)

    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    expect(iconsCtx('success')).toBe('\u{2705}')
  })

  it('should return nerd font glyph when nerd fonts are installed', async () => {
    vi.mocked(detectNerdFonts).mockResolvedValue(true)

    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    expect(iconsCtx('success')).toBe('\uF05D')
  })

  it('should return empty string for unknown icon names', async () => {
    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    expect(iconsCtx('nonexistent')).toBe('')
  })

  it('should report has() correctly', async () => {
    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    expect(iconsCtx.has('branch')).toBeTruthy()
    expect(iconsCtx.has('nonexistent')).toBeFalsy()
  })

  it('should report installed() correctly', async () => {
    vi.mocked(detectNerdFonts).mockResolvedValue(false)

    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    expect(iconsCtx.installed()).toBeFalsy()
  })

  it('should return category record with resolved icons', async () => {
    vi.mocked(detectNerdFonts).mockResolvedValue(false)

    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    const statusIcons = iconsCtx.category('status')
    expect(statusIcons).toHaveProperty('success')
    expect(statusIcons).toHaveProperty('error')
    expect(statusIcons['success']).toBe('\u{2705}')
  })

  it('should merge custom icons with defaults', async () => {
    const ctx = createMockCtx()
    const mw = icons({
      icons: {
        custom: { emoji: '\u{2B50}', nerdFont: '\uDB80\uDC00' },
      },
    })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const iconsCtx = (ctx as Record<string, unknown>)['icons'] as IconsContext
    expect(iconsCtx.has('custom')).toBeTruthy()
    expect(iconsCtx('custom')).toBe('\u{2B50}')
    expect(iconsCtx.has('branch')).toBeTruthy()
  })

  it('should trigger install prompt when autoSetup is true and fonts missing', async () => {
    vi.mocked(detectNerdFonts).mockResolvedValue(false)
    vi.mocked(installNerdFont).mockResolvedValue([null, true] as const)

    const ctx = createMockCtx()
    const mw = icons({ autoSetup: true })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(installNerdFont).toHaveBeenCalledOnce()
  })

  it('should not trigger install prompt when autoSetup is false', async () => {
    vi.mocked(detectNerdFonts).mockResolvedValue(false)

    const ctx = createMockCtx()
    const mw = icons({ autoSetup: false })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(installNerdFont).not.toHaveBeenCalled()
  })

  it('should not trigger install prompt when fonts are already installed', async () => {
    vi.mocked(detectNerdFonts).mockResolvedValue(true)

    const ctx = createMockCtx()
    const mw = icons({ autoSetup: true })
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(installNerdFont).not.toHaveBeenCalled()
  })

  it('should call next after decorating', async () => {
    const ctx = createMockCtx()
    const mw = icons()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
