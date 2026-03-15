import { runTestCli, setArgv, setupTestLifecycle } from '@test/core-utils.js'
import { describe, expect, it, vi } from 'vitest'

import { command } from '@/command.js'
import { createContext } from '@/context/index.js'
import type { Context } from '@/context/types.js'
import type { CommandMap } from '@/types.js'

import listCommand from '../../../../examples/simple/commands/list.js'

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

describe('examples/simple/commands/list', () => {
  describe('handler', () => {
    it('should render table with all 5 tasks', () => {
      const result = withCapturedStdout(() => {
        const ctx = createListContext({ args: { json: false, status: 'all' as const } })
        listCommand.handler(ctx)
      })
      expect(result).toContain('Set up CI pipeline')
      expect(result).toContain('Write integration tests')
      expect(result).toContain('Deploy to staging')
      expect(result).toContain('Update README')
      expect(result).toContain('Review security audit')
    })

    it('should filter to active tasks only', () => {
      const result = withCapturedStdout(() => {
        const ctx = createListContext({ args: { json: false, status: 'active' as const } })
        listCommand.handler(ctx)
      })
      expect(result).toContain('Write integration tests')
      expect(result).toContain('Deploy to staging')
      expect(result).toContain('Review security audit')
      expect(result).not.toContain('Set up CI pipeline')
      expect(result).not.toContain('Update README')
    })

    it('should filter to done tasks only', () => {
      const result = withCapturedStdout(() => {
        const ctx = createListContext({ args: { json: false, status: 'done' as const } })
        listCommand.handler(ctx)
      })
      expect(result).toContain('Set up CI pipeline')
      expect(result).toContain('Update README')
      expect(result).not.toContain('Write integration tests')
      expect(result).not.toContain('Deploy to staging')
      expect(result).not.toContain('Review security audit')
    })

    it('should output JSON array when --json', () => {
      const result = withCapturedStdout(() => {
        const ctx = createListContext({ args: { json: true, status: 'all' as const } })
        listCommand.handler(ctx)
      })
      const parsed = JSON.parse(result) as unknown[]
      expect(parsed).toHaveLength(5)
    })
  })

  describe('pipeline', () => {
    it('should default status to "all"', async () => {
      const handler = vi.fn()
      const commands: CommandMap = {
        list: command({ ...listCommand, handler }),
      }

      setArgv('list')
      await runTestCli({ commands, name: 'tasks', version: '1.0.0' })

      const ctx = handler.mock.calls[0]![0] as Context<{
        json: boolean
        status: 'all' | 'active' | 'done'
      }>
      expect(ctx.args.status).toBe('all')
    })
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ListArgs {
  readonly json: boolean
  readonly status: 'all' | 'active' | 'done'
}

function createListContext(overrides: { readonly args: ListArgs }): Context<ListArgs> {
  return createContext({
    args: overrides.args,
    config: {},
    meta: { command: ['list'], name: 'tasks', version: '1.0.0' },
  })
}

function withCapturedStdout(fn: () => void): string {
  const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  try {
    fn()
    return writeSpy.mock.calls.map((call) => String(call[0])).join('')
  } finally {
    writeSpy.mockRestore()
  }
}
