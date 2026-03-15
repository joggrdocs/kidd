import { describe, expect, it } from 'vitest'

import { SYMBOLS } from './constants.js'
import { formatResult } from './result.js'

describe('formatResult()', () => {
  it('should format a passing result', () => {
    const result = formatResult({ name: 'src/utils.test.ts', status: 'pass' })

    expect(result).toContain('src/utils.test.ts')
    expect(result).toContain(SYMBOLS.check)
  })

  it('should format a failing result', () => {
    const result = formatResult({ name: 'src/auth.test.ts', status: 'fail' })

    expect(result).toContain('src/auth.test.ts')
  })

  it('should format a warning result', () => {
    const result = formatResult({ name: 'src/config.ts', status: 'warn' })

    expect(result).toContain('src/config.ts')
  })

  it('should format a skipped result', () => {
    const result = formatResult({ name: 'src/old.test.ts', status: 'skip' })

    expect(result).toContain('src/old.test.ts')
  })

  it('should format a fixed result', () => {
    const result = formatResult({ name: 'src/lint.ts', status: 'fix' })

    expect(result).toContain('src/lint.ts')
  })

  it('should include detail text when provided', () => {
    const result = formatResult({
      detail: '3 tests passed',
      name: 'src/utils.test.ts',
      status: 'pass',
    })

    expect(result).toContain('3 tests passed')
  })

  it('should include duration when provided', () => {
    const result = formatResult({
      duration: 150,
      name: 'src/utils.test.ts',
      status: 'pass',
    })

    expect(result).toContain('150ms')
  })

  it('should include hint when provided', () => {
    const result = formatResult({
      hint: 'experimental',
      name: 'src/utils.test.ts',
      status: 'pass',
    })

    expect(result).toContain('[experimental]')
  })
})
