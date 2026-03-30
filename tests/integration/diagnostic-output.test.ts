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
  })
})
