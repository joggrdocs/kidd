import * as clack from '@clack/prompts'
import { describe, expect, it, vi } from 'vitest'

import { command } from '@/command.js'
import type { Context } from '@/context/types.js'
import type { CommandMap } from '@/types.js'

import initCommand from '../../examples/simple/commands/init.js'
import { runTestCli, setArgv, setupTestLifecycle } from '../helpers/core-utils.js'

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

const lifecycle = setupTestLifecycle()

describe('examples/simple/commands/init', () => {
  describe('pipeline', () => {
    it('should complete flow with all prompts answered', async () => {
      vi.mocked(clack.text).mockResolvedValue('my-app')
      vi.mocked(clack.select).mockResolvedValue('standard')
      vi.mocked(clack.multiselect).mockResolvedValue(['auth', 'db'])
      vi.mocked(clack.confirm).mockResolvedValue(true)

      const handler = vi.fn(initCommand.handler)
      const commands: CommandMap = {
        init: command({ ...initCommand, handler }),
      }

      setArgv('init')
      await runTestCli({ commands, name: 'tasks', version: '1.0.0' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(mockSpinnerInstance.start).toHaveBeenCalledWith('Scaffolding my-app')
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith('Created my-app')
    })

    it('should call prompts in correct order', async () => {
      const callOrder: string[] = []

      vi.mocked(clack.text).mockImplementation(async () => {
        callOrder.push('text')
        return 'my-app'
      })
      vi.mocked(clack.select).mockImplementation(async () => {
        callOrder.push('select')
        return 'minimal'
      })
      vi.mocked(clack.multiselect).mockImplementation(async () => {
        callOrder.push('multiselect')
        return ['ci']
      })
      vi.mocked(clack.confirm).mockImplementation(async () => {
        callOrder.push('confirm')
        return true
      })

      const commands: CommandMap = {
        init: command({ ...initCommand }),
      }

      setArgv('init')
      await runTestCli({ commands, name: 'tasks', version: '1.0.0' })

      expect(callOrder).toEqual(['text', 'select', 'multiselect', 'confirm'])
    })

    it('should exit when user declines confirmation', async () => {
      vi.mocked(clack.text).mockResolvedValue('my-app')
      vi.mocked(clack.select).mockResolvedValue('standard')
      vi.mocked(clack.multiselect).mockResolvedValue(['auth'])
      vi.mocked(clack.confirm).mockResolvedValue(false)

      const commands: CommandMap = {
        init: command({ ...initCommand }),
      }

      setArgv('init')
      await runTestCli({ commands, name: 'tasks', version: '1.0.0' })

      expect(lifecycle.getExitSpy()).toHaveBeenCalledWith(1)
    })

    it('should pass project name to spinner', async () => {
      vi.mocked(clack.text).mockResolvedValue('cool-project')
      vi.mocked(clack.select).mockResolvedValue('full')
      vi.mocked(clack.multiselect).mockResolvedValue(['auth', 'db', 'ci'])
      vi.mocked(clack.confirm).mockResolvedValue(true)

      const commands: CommandMap = {
        init: command({ ...initCommand }),
      }

      setArgv('init')
      await runTestCli({ commands, name: 'tasks', version: '1.0.0' })

      expect(mockSpinnerInstance.start).toHaveBeenCalledWith('Scaffolding cool-project')
    })
  })
})
