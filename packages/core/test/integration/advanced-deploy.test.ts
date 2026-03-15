import * as clack from '@clack/prompts'
import { setupTestLifecycle } from '@test/core-utils.js'
import { describe, expect, it, vi } from 'vitest'

import { createContext, isContextError } from '@/context/index.js'
import type { Context } from '@/context/types.js'

import previewCommand from '../../../../examples/advanced/src/commands/deploy/preview.js'
import productionCommand from '../../../../examples/advanced/src/commands/deploy/production.js'

const mockSpinnerInstance = vi.hoisted(() => ({
  message: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock(import('@clack/prompts'), async (importOriginal) => ({
  ...(await importOriginal()),
  cancel: vi.fn(),
  confirm: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  multiselect: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  spinner: vi.fn(() => mockSpinnerInstance),
  text: vi.fn(),
}))

setupTestLifecycle()

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

describe('examples/advanced/src/commands/deploy/preview', () => {
  describe('handler', () => {
    it('should output deploy info with correct URL', async () => {
      let captured = ''
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk: string | Uint8Array) => {
          captured += String(chunk)
          return true
        })

      const ctx = createPreviewContext({
        args: { branch: 'feat-xyz', clean: false },
      })
      await previewCommand.handler(ctx)

      writeSpy.mockRestore()

      const parsed = JSON.parse(captured) as { branch: string; environment: string; url: string }
      expect(parsed.url).toBe('https://preview-feat-xyz.acme-corp.acme.dev')
      expect(parsed.environment).toBe('preview')
      expect(parsed.branch).toBe('feat-xyz')
    })

    it('should log clean build when --clean', async () => {
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true)

      const ctx = createPreviewContext({
        args: { branch: 'main', clean: true },
      })
      await previewCommand.handler(ctx)

      writeSpy.mockRestore()

      expect(mockSpinnerInstance.message).toHaveBeenCalledWith('Running clean build')
    })
  })
})

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

describe('examples/advanced/src/commands/deploy/production', () => {
  describe('handler', () => {
    it('should skip prompt when --force', async () => {
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true)

      const ctx = createProductionContext({
        args: { force: true, tag: 'v1.0.0' },
      })
      await productionCommand.handler(ctx)

      writeSpy.mockRestore()

      expect(clack.confirm).not.toHaveBeenCalled()
      expect(mockSpinnerInstance.start).toHaveBeenCalled()
    })

    it('should prompt when force is false', async () => {
      vi.mocked(clack.confirm).mockResolvedValue(true)
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true)

      const ctx = createProductionContext({
        args: { force: false, tag: 'v1.0.0' },
      })
      await productionCommand.handler(ctx)

      writeSpy.mockRestore()

      expect(clack.confirm).toHaveBeenCalledOnce()
    })

    it('should exit when user declines', async () => {
      vi.mocked(clack.confirm).mockResolvedValue(false)
      const ctx = createProductionContext({
        args: { force: false, tag: 'v1.0.0' },
      })

      let caught: unknown
      try {
        await productionCommand.handler(ctx)
      } catch (error) {
        caught = error
      }

      expect(caught).toBeDefined()
      expect(isContextError(caught)).toBeTruthy()
    })

    it('should output deploy JSON on success', async () => {
      let captured = ''
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation((chunk: string | Uint8Array) => {
          captured += String(chunk)
          return true
        })

      const ctx = createProductionContext({
        args: { force: true, tag: 'v2.3.1' },
      })
      await productionCommand.handler(ctx)

      writeSpy.mockRestore()

      const parsed = JSON.parse(captured) as {
        environment: string
        org: string
        tag: string
        url: string
      }
      expect(parsed.environment).toBe('production')
      expect(parsed.tag).toBe('v2.3.1')
      expect(parsed.org).toBe('acme-corp')
      expect(parsed.url).toBe('https://acme-corp.acme.dev')
    })
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AcmeConfig {
  readonly apiUrl: string
  readonly defaultEnvironment: string
  readonly org: string
}

function createPreviewContext(overrides: {
  readonly args: { readonly branch: string; readonly clean: boolean }
}): Context<{ branch: string; clean: boolean }, AcmeConfig> {
  return createContext({
    args: overrides.args,
    config: {
      apiUrl: 'https://api.acme.dev',
      defaultEnvironment: 'staging',
      org: 'acme-corp',
    },
    meta: { command: ['deploy', 'preview'], name: 'acme', version: '2.0.0' },
  })
}

function createProductionContext(overrides: {
  readonly args: { readonly force: boolean; readonly tag: string }
}): Context<{ force: boolean; tag: string }, AcmeConfig> {
  return createContext({
    args: overrides.args,
    config: {
      apiUrl: 'https://api.acme.dev',
      defaultEnvironment: 'staging',
      org: 'acme-corp',
    },
    meta: { command: ['deploy', 'production'], name: 'acme', version: '2.0.0' },
  })
}
