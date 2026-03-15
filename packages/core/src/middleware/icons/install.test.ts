import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('font-list', () => ({
  getFonts: vi.fn(async () => []),
}))

vi.mock('node:child_process', () => ({
  exec: vi.fn((_cmd: string, _opts: unknown, cb?: Function) => {
    const callback = cb ?? _opts
    if (typeof callback === 'function') {
      callback(null, { stderr: '', stdout: '' })
    }
  }),
}))

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async () => undefined),
  rm: vi.fn(async () => undefined),
}))

import { getFonts } from 'font-list'

import { installNerdFont } from './install.js'

function createMockCtx() {
  return {
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      message: vi.fn(),
      step: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
    },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() },
  }
}

describe('installNerdFont()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('font validation', () => {
    it('should return error for font names with shell metacharacters', async () => {
      const ctx = createMockCtx()

      const [error] = await installNerdFont({ ctx, font: 'Font;rm -rf /' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Invalid font name')
    })

    it('should return error for font names with backticks', async () => {
      const ctx = createMockCtx()

      const [error] = await installNerdFont({ ctx, font: 'Font`whoami`' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Invalid font name')
    })

    it('should return error for font names with spaces', async () => {
      const ctx = createMockCtx()

      const [error] = await installNerdFont({ ctx, font: 'Fira Code' })

      expect(error).toMatchObject({ type: 'install_failed' })
      expect(error?.message).toContain('Invalid font name')
    })

    it('should accept valid alphanumeric font names', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(false)

      const [error, value] = await installNerdFont({ ctx, font: 'JetBrainsMono' })

      expect(error).toBeNull()
      expect(value).toBe(false)
    })

    it('should accept font names with hyphens', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(false)

      const [error, value] = await installNerdFont({ ctx, font: 'Go-Mono' })

      expect(error).toBeNull()
      expect(value).toBe(false)
    })
  })

  describe('with font option (confirmation flow)', () => {
    it('should prompt for confirmation when font is provided', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(false)

      await installNerdFont({ ctx, font: 'Hack' })

      expect(ctx.prompts.confirm).toHaveBeenCalledOnce()
      expect(ctx.prompts.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Hack') })
      )
    })

    it('should return ok(false) when user declines confirmation', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(false)

      const [error, value] = await installNerdFont({ ctx, font: 'Hack' })

      expect(error).toBeNull()
      expect(value).toBe(false)
    })

    it('should call installFontWithSpinner when user confirms', async () => {
      const ctx = createMockCtx()
      vi.mocked(ctx.prompts.confirm).mockResolvedValue(true)

      await installNerdFont({ ctx, font: 'Hack' })

      expect(ctx.spinner.start).toHaveBeenCalledWith(
        expect.stringContaining('Installing Hack Nerd Font')
      )
    })
  })

  describe('without font option (selection flow)', () => {
    it('should detect matching fonts and show selection prompt', async () => {
      const ctx = createMockCtx()
      vi.mocked(getFonts).mockResolvedValue(['JetBrains Mono', 'Arial'])
      vi.mocked(ctx.prompts.select).mockResolvedValue(undefined)

      await installNerdFont({ ctx })

      expect(ctx.spinner.start).toHaveBeenCalledWith('Detecting installed fonts...')
      expect(ctx.prompts.select).toHaveBeenCalledOnce()
    })

    it('should return ok(false) when user cancels font selection', async () => {
      const ctx = createMockCtx()
      vi.mocked(getFonts).mockResolvedValue([])
      vi.mocked(ctx.prompts.select).mockResolvedValue(undefined)

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBe(false)
    })

    it('should return ok(false) when user cancels action selection', async () => {
      const ctx = createMockCtx()
      vi.mocked(getFonts).mockResolvedValue([])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce(undefined)

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBe(false)
    })
  })

  describe('selection flow with auto install', () => {
    it('should show spinner and attempt installation when auto is selected', async () => {
      const ctx = createMockCtx()
      vi.mocked(getFonts).mockResolvedValue([])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce('auto')

      await installNerdFont({ ctx })

      expect(ctx.spinner.start).toHaveBeenCalledWith(
        expect.stringContaining('Installing JetBrainsMono Nerd Font')
      )
    })
  })

  describe('selection flow with show commands', () => {
    it('should display install commands when commands is selected', async () => {
      const ctx = createMockCtx()
      vi.mocked(getFonts).mockResolvedValue([])
      vi.mocked(ctx.prompts.select)
        .mockResolvedValueOnce('JetBrainsMono')
        .mockResolvedValueOnce('commands')

      const [error, value] = await installNerdFont({ ctx })

      expect(error).toBeNull()
      expect(value).toBe(false)
      expect(ctx.logger.info).toHaveBeenCalled()
    })
  })
})
