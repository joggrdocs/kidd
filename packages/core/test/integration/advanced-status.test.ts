import { setupTestLifecycle } from '@test/core-utils.js'
import { describe, expect, it, vi } from 'vitest'

import { createContext } from '@/context/index.js'
import type { Context } from '@/context/types.js'

import statusCommand from '../../../../examples/advanced/src/commands/status.js'

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

describe('examples/advanced/src/commands/status', () => {
  describe('handler', () => {
    it('should output JSON with cli name and version', () => {
      const writeSpy = mockStdoutWrite()
      const ctx = createStatusContext()
      statusCommand.handler(ctx)
      const result = capturedOutput(writeSpy)
      writeSpy.mockRestore()
      const parsed = JSON.parse(result) as { cli: { name: string; version: string } }
      expect(parsed.cli.name).toBe('acme')
      expect(parsed.cli.version).toBe('2.0.0')
    })

    it('should include config values in output', () => {
      const writeSpy = mockStdoutWrite()
      const ctx = createStatusContext()
      statusCommand.handler(ctx)
      const result = capturedOutput(writeSpy)
      writeSpy.mockRestore()
      const parsed = JSON.parse(result) as {
        config: { apiUrl: string; environment: string; org: string }
      }
      expect(parsed.config.apiUrl).toBe('https://api.acme.dev')
      expect(parsed.config.org).toBe('acme-corp')
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

function createStatusContext(): Context<Record<string, never>, AcmeConfig> {
  return createContext({
    args: {},
    config: {
      apiUrl: 'https://api.acme.dev',
      defaultEnvironment: 'staging',
      org: 'acme-corp',
    },
    meta: { command: ['status'], name: 'acme', version: '2.0.0' },
  })
}

function mockStdoutWrite(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
}

function capturedOutput(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls.map((call) => String(call[0])).join('')
}
