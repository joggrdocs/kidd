import { describe, expect, it } from 'vitest'

import { toError, toErrorMessage } from './predicates.js'

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

describe(toErrorMessage, () => {
  it('should return the message from an Error', () => {
    const result = toErrorMessage(new Error('something broke'))
    expect(result).toBe('something broke')
  })

  it('should return the string representation of a string value', () => {
    const result = toErrorMessage('raw string error')
    expect(result).toBe('raw string error')
  })

  it('should return the string representation of a number', () => {
    const result = toErrorMessage(500)
    expect(result).toBe('500')
  })

  it('should return "null" for null', () => {
    const result = toErrorMessage(null)
    expect(result).toBe('null')
  })

  it('should return "undefined" for undefined', () => {
    const result = toErrorMessage(undefined)
    expect(result).toBe('undefined')
  })

  it('should return the message from an Error subclass', () => {
    const result = toErrorMessage(new TypeError('bad type'))
    expect(result).toBe('bad type')
  })
})
