import { describe, expect, it } from 'vitest'

import { createExampleRunner } from '../helpers.js'

const run = createExampleRunner({ example: 'diagnostic-output' })

describe('examples/diagnostic-output (built CLI)', () => {
  describe('--help', () => {
    const help = run('--help')

    it('should display all commands', () => {
      expect(help).toContain('dx lint')
      expect(help).toContain('dx test')
      expect(help).toContain('dx check')
    })

    it('should display command descriptions', () => {
      expect(help).toContain('Run linter on the project (simulated)')
      expect(help).toContain('Run tests on the project (simulated)')
      expect(help).toContain('Run lint + tests together (simulated)')
    })
  })
})
