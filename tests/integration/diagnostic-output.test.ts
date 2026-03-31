import { describe, expect, it } from 'vitest'

import { createBinaryRunner, createNodeRunner } from '../helpers.js'

const runners = [
  { label: 'node', run: createNodeRunner({ example: 'diagnostic-output' }) },
  { label: 'binary', run: createBinaryRunner({ example: 'diagnostic-output' }) },
] as const

describe('examples/diagnostic-output', () => {
  describe.each(runners)('$label', ({ run }) => {
    describe('--help', () => {
      it('should display all commands', () => {
        const help = run('--help')
        expect(help).toContain('dx lint')
        expect(help).toContain('dx test')
        expect(help).toContain('dx check')
      })

      it('should display command descriptions', () => {
        const help = run('--help')
        expect(help).toContain('Run linter on the project (simulated)')
        expect(help).toContain('Run tests on the project (simulated)')
        expect(help).toContain('Run lint + tests together (simulated)')
      })
    })

    describe('lint', () => {
      it('should show lint findings with file paths', () => {
        const output = run('lint')
        expect(output).toContain('src/auth/middleware.ts')
        expect(output).toContain('src/config/loader.ts')
        expect(output).toContain('src/utils/helpers.ts')
      })

      it('should show lint findings with rule names', () => {
        const output = run('lint')
        expect(output).toContain('no-param-reassign')
        expect(output).toContain('no-unused-vars')
        expect(output).toContain('prefer-const')
        expect(output).toContain('no-console')
      })

      it('should show lint findings with severity', () => {
        const output = run('lint')
        expect(output).toContain('error')
        expect(output).toContain('warning')
      })

      it('should show summary stats', () => {
        const output = run('lint')
        expect(output).toContain('1 error')
        expect(output).toContain('3 warnings')
        expect(output).toContain('95 files')
        expect(output).toContain('200 rules')
        expect(output).toContain('in 142ms')
      })
    })

    describe('test', () => {
      it('should show test file names', () => {
        const output = run('test')
        expect(output).toContain('src/auth/middleware.test.ts')
        expect(output).toContain('src/config/loader.test.ts')
        expect(output).toContain('src/utils/helpers.test.ts')
        expect(output).toContain('src/utils/format.test.ts')
        expect(output).toContain('src/legacy/parser.test.ts')
        expect(output).toContain('src/api/client.test.ts')
        expect(output).toContain('src/api/retry.test.ts')
        expect(output).toContain('src/cli/commands.test.ts')
      })

      it('should show pass/fail/skip counts', () => {
        const output = run('test')
        expect(output).toContain('2 failed')
        expect(output).toContain('5 passed')
        expect(output).toContain('1 skipped')
      })

      it('should show failure details', () => {
        const output = run('test')
        expect(output).toContain('expected 3 but received 5')
        expect(output).toContain('timeout after 5000ms')
      })

      it('should show suite summary', () => {
        const output = run('test')
        expect(output).toContain('1 failed')
        expect(output).toContain('5 passed')
      })

      it('should show duration', () => {
        const output = run('test')
        expect(output).toContain('6.63s')
      })
    })

    describe('check', () => {
      it('should show lint findings with file path and rule', () => {
        const output = run('check')
        expect(output).toContain('src/utils/format.ts')
        expect(output).toContain('no-unused-vars')
      })

      it('should show lint summary stats', () => {
        const output = run('check')
        expect(output).toContain('1 warning')
        expect(output).toContain('2 fixed')
        expect(output).toContain('12 files')
        expect(output).toContain('in 47ms')
      })

      it('should show test file names', () => {
        const output = run('check')
        expect(output).toContain('src/utils/format.test.ts')
        expect(output).toContain('src/auth/token.test.ts')
        expect(output).toContain('src/config/schema.test.ts')
        expect(output).toContain('src/utils/validate.ts')
      })

      it('should show test summary stats', () => {
        const output = run('check')
        expect(output).toContain('3 passed')
        expect(output).toContain('45ms')
      })

      it('should show fix details', () => {
        const output = run('check')
        expect(output).toContain('auto-fixed 2 issues')
      })
    })
  })
})
