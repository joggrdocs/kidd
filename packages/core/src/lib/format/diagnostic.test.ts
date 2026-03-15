import { describe, expect, it, vi } from 'vitest'

import { formatDiagnostic } from './diagnostic'

vi.mock(import('./code-frame.js'), () => ({
  formatCodeFrame: vi.fn((input: { filePath: string }) => `  [code-frame: ${input.filePath}]`),
}))

describe('formatDiagnostic()', () => {
  it('should format an error diagnostic', () => {
    const result = formatDiagnostic({
      message: 'x is unused',
      rule: 'no-unused-vars',
      severity: 'error',
    })

    expect(result).toContain('error')
    expect(result).toContain('no-unused-vars')
    expect(result).toContain('x is unused')
  })

  it('should format a warning diagnostic', () => {
    const result = formatDiagnostic({
      message: 'Unexpected console statement',
      rule: 'no-console',
      severity: 'warning',
    })

    expect(result).toContain('warning')
  })

  it('should format a hint diagnostic', () => {
    const result = formatDiagnostic({
      message: 'Use const instead of let',
      rule: 'prefer-const',
      severity: 'hint',
    })

    expect(result).toContain('hint')
  })

  it('should include category when provided', () => {
    const result = formatDiagnostic({
      category: 'correctness',
      message: 'x is unused',
      rule: 'no-unused-vars',
      severity: 'error',
    })

    expect(result).toContain('correctness')
  })

  it('should include code frame when provided', () => {
    const result = formatDiagnostic({
      frame: {
        annotation: {
          column: 7,
          length: 1,
          line: 1,
          message: 'this variable is unused',
        },
        filePath: 'src/index.ts',
        lines: ['const x = 1'],
        startLine: 1,
      },
      message: 'x is unused',
      rule: 'no-unused-vars',
      severity: 'error',
    })

    expect(result).toContain('src/index.ts')
  })

  it('should include help text when provided', () => {
    const result = formatDiagnostic({
      help: 'consider removing x',
      message: 'x is unused',
      rule: 'no-unused-vars',
      severity: 'error',
    })

    expect(result).toContain('help')
    expect(result).toContain('consider removing x')
  })
})
