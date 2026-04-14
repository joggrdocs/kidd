import { describe, expect, it } from 'vitest'

import { formatBuildError } from './format-error.js'

describe(formatBuildError, () => {
  it('returns only the header when verbose is false', () => {
    const result = formatBuildError({ phase: 'build', error: new Error('kaboom'), verbose: false })
    expect(result).toBe('tsdown build failed')
  })

  it('includes the error message when verbose is true', () => {
    const result = formatBuildError({
      phase: 'build',
      error: new Error('module not found'),
      verbose: true,
    })
    expect(result).toBe('tsdown build failed\nmodule not found')
  })

  it('uses the watch phase in the header', () => {
    const result = formatBuildError({ phase: 'watch', error: new Error('timeout'), verbose: false })
    expect(result).toBe('tsdown watch failed')
  })

  it('coerces a non-Error value to a message when verbose', () => {
    const result = formatBuildError({ phase: 'build', error: 'string error', verbose: true })
    expect(result).toBe('tsdown build failed\nstring error')
  })

  it('coerces a numeric value to a message when verbose', () => {
    const result = formatBuildError({ phase: 'watch', error: 42, verbose: true })
    expect(result).toBe('tsdown watch failed\n42')
  })

  it('returns only the header when error message is whitespace and verbose', () => {
    const result = formatBuildError({ phase: 'build', error: new Error('   '), verbose: true })
    expect(result).toBe('tsdown build failed')
  })
})
