import { describe, expect, it } from 'vitest'

import { toError } from './transform.js'

describe(toError, () => {
  it('should return the same Error instance when given an Error', () => {
    const original = new Error('original')
    const result = toError(original)
    expect(result).toBe(original)
  })

  it('should wrap a string into an Error', () => {
    const result = toError('something went wrong')
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('something went wrong')
  })

  it('should wrap a number into an Error', () => {
    const result = toError(404)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('404')
  })

  it('should wrap null into an Error', () => {
    const result = toError(null)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('null')
  })

  it('should wrap undefined into an Error', () => {
    const result = toError(undefined)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('undefined')
  })

  it('should wrap an object into an Error', () => {
    const result = toError({ code: 'ENOENT' })
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('[object Object]')
  })

  it('should preserve Error subclasses', () => {
    const original = new TypeError('bad type')
    const result = toError(original)
    expect(result).toBe(original)
    expect(result).toBeInstanceOf(TypeError)
  })
})
