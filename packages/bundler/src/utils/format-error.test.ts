import { describe, expect, it } from 'vitest'

import { formatBuildError } from './format-error.js'

describe(formatBuildError, () => {
  it('returns only the header when verbose is false', () => {
    const result = formatBuildError('build', new Error('kaboom'), false)
    expect(result).toBe('tsdown build failed')
  })

  it('includes the error message when verbose is true', () => {
    const result = formatBuildError('build', new Error('module not found'), true)
    expect(result).toBe('tsdown build failed\nmodule not found')
  })

  it('uses the watch phase in the header', () => {
    const result = formatBuildError('watch', new Error('timeout'), false)
    expect(result).toBe('tsdown watch failed')
  })

  it('coerces a non-Error value to a message when verbose', () => {
    const result = formatBuildError('build', 'string error', true)
    expect(result).toBe('tsdown build failed\nstring error')
  })

  it('coerces a numeric value to a message when verbose', () => {
    const result = formatBuildError('watch', 42, true)
    expect(result).toBe('tsdown watch failed\n42')
  })

  it('returns only the header when error message is whitespace and verbose', () => {
    const result = formatBuildError('build', new Error('   '), true)
    expect(result).toBe('tsdown build failed')
  })
})
