import { sep } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createBinaryRunner, createNodeRunner } from '../helpers.js'

const runners = [
  { label: 'node', run: createNodeRunner({ example: 'simple' }) },
  { label: 'binary', run: createBinaryRunner({ example: 'simple' }) },
] as const

describe('examples/simple', () => {
  describe.each(runners)('$label', ({ run }) => {
    describe('--help', () => {
      it('should display all commands', () => {
        const help = run('--help')
        expect(help).toContain('tasks greet')
        expect(help).toContain('tasks init')
        expect(help).toContain('tasks list')
        expect(help).toContain('tasks paths')
      })

      it('should display command descriptions', () => {
        const help = run('--help')
        expect(help).toContain('Greet someone by name')
        expect(help).toContain('Initialize a new project interactively')
        expect(help).toContain('List all tasks')
      })
    })

    describe('greet', () => {
      it('should greet by name', () => {
        const output = run('greet', 'Alice')
        expect(output).toContain('Hello, Alice!')
      })

      it('should uppercase when --shout', () => {
        const output = run('greet', 'Bob', '--shout')
        expect(output).toContain('HELLO, BOB!')
      })
    })

    describe('list', () => {
      it('should display all tasks by default', () => {
        const output = run('list')
        expect(output).toContain('Set up CI pipeline')
        expect(output).toContain('Write integration tests')
        expect(output).toContain('Deploy to staging')
        expect(output).toContain('Update README')
        expect(output).toContain('Review security audit')
      })

      it('should filter to active tasks', () => {
        const output = run('list', '--status', 'active')
        expect(output).toContain('Write integration tests')
        expect(output).toContain('Deploy to staging')
        expect(output).toContain('Review security audit')
        expect(output).not.toContain('Set up CI pipeline')
        expect(output).not.toContain('Update README')
      })

      it('should filter to done tasks', () => {
        const output = run('list', '--status', 'done')
        expect(output).toContain('Set up CI pipeline')
        expect(output).toContain('Update README')
        expect(output).not.toContain('Write integration tests')
        expect(output).not.toContain('Deploy to staging')
        expect(output).not.toContain('Review security audit')
      })

      it('should output valid JSON with --json', () => {
        const output = run('list', '--json')
        const parsed = JSON.parse(output) as unknown[]
        expect(parsed).toHaveLength(5)
      })

      it('should output filtered JSON with --json --status active', () => {
        const output = run('list', '--json', '--status', 'active')
        const parsed = JSON.parse(output) as unknown[]
        expect(parsed).toHaveLength(3)
      })
    })

    describe('paths', () => {
      it('should output valid JSON with resolved paths', () => {
        const output = run('paths')
        const parsed = JSON.parse(output) as Record<string, unknown>
        expect(parsed).toHaveProperty('cwd')
        expect(parsed).toHaveProperty('globalDir')
        expect(parsed).toHaveProperty('sep')
      })

      it('should use the OS-native path separator', () => {
        const output = run('paths')
        const parsed = JSON.parse(output) as { sep: string }
        expect(parsed.sep).toBe(sep)
      })

      it('should resolve globalDir as an absolute path with native separators', () => {
        const output = run('paths')
        const parsed = JSON.parse(output) as { globalDir: string }
        expect(parsed.globalDir).toContain(sep)
        expect(parsed.globalDir).toContain('.tasks')
      })

      it('should resolve globalConfigPath with native separators', () => {
        const output = run('paths')
        const parsed = JSON.parse(output) as { globalConfigPath: string }
        expect(parsed.globalConfigPath).toContain(`${sep}.tasks${sep}config.json`)
      })

      it('should resolve cwd as an absolute path with native separators', () => {
        const output = run('paths')
        const parsed = JSON.parse(output) as { cwd: string }
        expect(parsed.cwd).toContain(sep)
        expect(parsed.cwd).not.toBe('')
      })

      it('should not contain mixed path separators in any resolved path', () => {
        const output = run('paths')
        const parsed = JSON.parse(output) as Record<string, unknown>
        const pathKeys = ['cwd', 'globalDir', 'globalConfigPath', 'localDir', 'localConfigPath']
        pathKeys
          .map((key) => parsed[key])
          .filter((value): value is string => typeof value === 'string')
          .reduce((_acc, value) => {
            if (sep === '\\') {
              expect(value).not.toContain('/')
            }
            return _acc
          }, undefined)
      })

      it('should include meta with CLI name and dirs', () => {
        const output = run('paths')
        const parsed = JSON.parse(output) as {
          meta: { name: string; dirs: { global: string; local: string } }
        }
        expect(parsed.meta.name).toBe('tasks')
        expect(parsed.meta.dirs.global).toBe('.tasks')
        expect(parsed.meta.dirs.local).toBe('.tasks')
      })
    })
  })
})
