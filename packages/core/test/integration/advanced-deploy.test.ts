import * as clack from '@clack/prompts'
import { createWritableCapture, setupTestLifecycle } from '@test/core-utils.js'
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
      const { stream, output } = createWritableCapture()
      const ctx = createPreviewContext({
        args: { branch: 'feat-xyz', clean: false },
        output: stream,
      })
      await previewCommand.handler(ctx)
      const parsed = JSON.parse(output()) as { branch: string; environment: string; url: string }
      expect(parsed.url).toBe('https://preview-feat-xyz.acme-corp.acme.dev')
      expect(parsed.environment).toBe('preview')
      expect(parsed.branch).toBe('feat-xyz')
    })

    it('should log clean build when --clean', async () => {
      const { stream } = createWritableCapture()
      const ctx = createPreviewContext({
        args: { branch: 'main', clean: true },
        output: stream,
      })
      await previewCommand.handler(ctx)
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
      const { stream } = createWritableCapture()
      const ctx = createProductionContext({
        args: { force: true, tag: 'v1.0.0' },
        output: stream,
      })
      await productionCommand.handler(ctx)
      expect(clack.confirm).not.toHaveBeenCalled()
      expect(mockSpinnerInstance.start).toHaveBeenCalled()
    })

    it('should prompt when force is false', async () => {
      vi.mocked(clack.confirm).mockResolvedValue(true)
      const { stream } = createWritableCapture()
      const ctx = createProductionContext({
        args: { force: false, tag: 'v1.0.0' },
        output: stream,
      })
      await productionCommand.handler(ctx)
      expect(clack.confirm).toHaveBeenCalledOnce()
    })

    it('should exit when user declines', async () => {
      vi.mocked(clack.confirm).mockResolvedValue(false)
      const { stream } = createWritableCapture()
      const ctx = createProductionContext({
        args: { force: false, tag: 'v1.0.0' },
        output: stream,
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
      const { stream, output } = createWritableCapture()
      const ctx = createProductionContext({
        args: { force: true, tag: 'v2.3.1' },
        output: stream,
      })
      await productionCommand.handler(ctx)
      const parsed = JSON.parse(output()) as {
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
  readonly output: NodeJS.WriteStream
}): Context<{ branch: string; clean: boolean }, AcmeConfig> {
  return createContext({
    args: overrides.args,
    config: {
      apiUrl: 'https://api.acme.dev',
      defaultEnvironment: 'staging',
      org: 'acme-corp',
    },
    meta: { command: ['deploy', 'preview'], name: 'acme', version: '2.0.0' },
    output: overrides.output,
  })
}

function createProductionContext(overrides: {
  readonly args: { readonly force: boolean; readonly tag: string }
  readonly output: NodeJS.WriteStream
}): Context<{ force: boolean; tag: string }, AcmeConfig> {
  return createContext({
    args: overrides.args,
    config: {
      apiUrl: 'https://api.acme.dev',
      defaultEnvironment: 'staging',
      org: 'acme-corp',
    },
    meta: { command: ['deploy', 'production'], name: 'acme', version: '2.0.0' },
    output: overrides.output,
  })
}
