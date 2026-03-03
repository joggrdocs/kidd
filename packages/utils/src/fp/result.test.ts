import { describe, expect, it } from 'vitest'

import { attempt, attemptAsync, err, ok } from '../fp/index.js'
import type { AsyncResult, Result } from '../fp/index.js'

describe(ok, () => {
  describe('void overload', () => {
    it('should return [null, undefined] when called with no arguments', () => {
      const result = ok()
      expect(result).toEqual([null, undefined])
    })

    it('should have null as the error element', () => {
      const [error] = ok()
      expect(error).toBeNull()
    })
  })

  describe('value overload', () => {
    it('should wrap a string value', () => {
      const result = ok('hello')
      expect(result).toEqual([null, 'hello'])
    })

    it('should wrap a number value', () => {
      const result = ok(42)
      expect(result).toEqual([null, 42])
    })

    it('should wrap an object value', () => {
      const obj = { name: 'test', version: '1.0' }
      const result = ok(obj)
      expect(result).toEqual([null, obj])
    })

    it('should wrap an array value', () => {
      const arr = [1, 2, 3]
      const result = ok(arr)
      expect(result).toEqual([null, arr])
    })

    it('should wrap a nested Result value', () => {
      const inner = ok('nested')
      const result = ok(inner)
      expect(result).toEqual([null, [null, 'nested']])
    })
  })
})

describe(err, () => {
  it('should pass through an Error instance', () => {
    const error = new Error('something broke')
    const result = err(error)
    expect(result[0]).toBe(error)
    expect(result[1]).toBeNull()
  })

  it('should coerce a string to an Error', () => {
    const result = err('not found')
    expect(result[0]).toBeInstanceOf(Error)
    expect(result[0].message).toBe('not found')
    expect(result[1]).toBeNull()
  })

  it('should coerce a number to an Error', () => {
    const result = err(404)
    expect(result[0]).toBeInstanceOf(Error)
    expect(result[0].message).toBe('404')
  })

  it('should coerce null to an Error', () => {
    const result = err(null)
    expect(result[0]).toBeInstanceOf(Error)
    expect(result[0].message).toBe('null')
  })

  it('should preserve Error subclasses', () => {
    const original = new TypeError('bad type')
    const result = err(original)
    expect(result[0]).toBe(original)
    expect(result[0]).toBeInstanceOf(TypeError)
  })
})

describe('Result destructuring', () => {
  it('should destructure a success tuple', () => {
    const result: Result<string> = ok('value')
    const [error, value] = result

    expect(error).toBeNull()
    expect(value).toBe('value')
  })

  it('should destructure a failure tuple', () => {
    const result: Result<string> = err(new Error('fail'))
    const [error, value] = result

    expect(error).toBeInstanceOf(Error)
    expect(value).toBeNull()
  })

  it('should narrow types via null check on error', () => {
    const result: Result<number> = ok(10)
    const [error, value] = result

    if (error) {
      expect.unreachable('should not reach error branch')
    } else {
      expect(value).toBe(10)
    }
  })
})

describe('AsyncResult type', () => {
  it('should resolve to a success Result', async () => {
    const asyncResult: AsyncResult<string> = Promise.resolve(ok('async value'))
    const [error, value] = await asyncResult

    expect(error).toBeNull()
    expect(value).toBe('async value')
  })

  it('should resolve to a failure Result', async () => {
    const asyncResult: AsyncResult<string> = Promise.resolve(err(new Error('async fail')))
    const [error, value] = await asyncResult

    expect(error).toBeInstanceOf(Error)
    expect(value).toBeNull()
  })
})

describe('attempt + Result', () => {
  it('should return a success-compatible tuple on success', () => {
    const [error, value] = attempt(() => 42)

    expect(error).toBeNull()
    expect(value).toBe(42)
  })

  it('should return a failure-compatible tuple on thrown error', () => {
    const [error, value] = attempt((): number => {
      // eslint-disable-next-line no-restricted-syntax
      throw new Error('boom')
    })

    expect(error).toBeInstanceOf(Error)
    expect(value).toBeNull()
  })
})

describe('attemptAsync + Result', () => {
  it('should return a success-compatible tuple on async success', async () => {
    const [error, value] = await attemptAsync(async () => 'async ok')

    expect(error).toBeNull()
    expect(value).toBe('async ok')
  })

  it('should return a failure-compatible tuple on async rejection', async () => {
    const [error, value] = await attemptAsync(async (): Promise<string> => {
      // eslint-disable-next-line no-restricted-syntax
      throw new Error('async boom')
    })

    expect(error).toBeInstanceOf(Error)
    expect(value).toBeNull()
  })
})
