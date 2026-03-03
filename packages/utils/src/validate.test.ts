import { describe, expect, it } from 'vitest'
import type { ZodError } from 'zod'
import { z } from 'zod'

import { formatZodIssues, validate } from './validate.js'

/**
 * Helper: a simple error factory that wraps a ZodError into a plain Error
 * whose message contains the formatted issues.
 */
function defaultFactory(error: ZodError): Error {
  const issues = error.issues.map((issue) => issue.message).join('; ')
  return new Error(`Validation failed: ${issues}`)
}

describe('validate() with valid input', () => {
  it('returns [null, data] for a z.object schema', () => {
    const schema = z.object({ age: z.number(), name: z.string() })
    const [error, data] = validate(schema, { age: 30, name: 'Alice' }, defaultFactory)
    expect(error).toBeNull()
    expect(data).toEqual({ age: 30, name: 'Alice' })
  })

  it('returns [null, data] for a z.string schema', () => {
    const [error, data] = validate(z.string(), 'hello', defaultFactory)
    expect(error).toBeNull()
    expect(data).toBe('hello')
  })

  it('returns [null, data] for a z.number schema', () => {
    const [error, data] = validate(z.number(), 42, defaultFactory)
    expect(error).toBeNull()
    expect(data).toBe(42)
  })

  it('returns [null, data] for a z.array schema', () => {
    const [error, data] = validate(z.array(z.number()), [1, 2, 3], defaultFactory)
    expect(error).toBeNull()
    expect(data).toEqual([1, 2, 3])
  })

  it('returns [null, data] for a z.boolean schema', () => {
    const [error, data] = validate(z.boolean(), true, defaultFactory)
    expect(error).toBeNull()
    expect(data).toBeTruthy()
  })

  it('strips unknown keys when schema uses .strict() is not set (default strip)', () => {
    const schema = z.object({ first: z.number() })
    const [error, data] = validate(schema, { extra: 2, first: 1 }, defaultFactory)
    expect(error).toBeNull()
    expect(data).toEqual({ first: 1 })
    expect(data).not.toHaveProperty('extra')
  })
})

describe('validate() with schema transforms', () => {
  it('applies a string transform', () => {
    const schema = z.string().transform((str) => str.toUpperCase())
    const [error, data] = validate(schema, 'hello', defaultFactory)
    expect(error).toBeNull()
    expect(data).toBe('HELLO')
  })

  it('applies a number transform', () => {
    const schema = z.number().transform((num) => num * 2)
    const [error, data] = validate(schema, 5, defaultFactory)
    expect(error).toBeNull()
    expect(data).toBe(10)
  })

  it('applies default values', () => {
    const schema = z.object({
      host: z.string().default('localhost'),
      port: z.number().default(3000),
    })
    const [error, data] = validate(schema, {}, defaultFactory)
    expect(error).toBeNull()
    expect(data).toEqual({ host: 'localhost', port: 3000 })
  })

  it('applies coercion via z.coerce', () => {
    const schema = z.coerce.number()
    const [error, data] = validate(schema, '42', defaultFactory)
    expect(error).toBeNull()
    expect(data).toBe(42)
  })
})

describe('validate() with invalid input', () => {
  it('returns [Error, null] for an invalid z.object input', () => {
    const schema = z.object({ name: z.string() })
    const [error, data] = validate(schema, {}, defaultFactory)
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Validation failed')
  })

  it('returns [Error, null] for an invalid z.string input', () => {
    const [error, data] = validate(z.string(), 123, defaultFactory)
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Validation failed')
  })

  it('returns [Error, null] for an invalid z.number input', () => {
    const [error, data] = validate(z.number(), 'abc', defaultFactory)
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Validation failed')
  })

  it('returns [Error, null] for an invalid z.array input', () => {
    const [error, data] = validate(z.array(z.string()), 'not-array', defaultFactory)
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Validation failed')
  })

  it('returns the exact Error returned by the factory', () => {
    const customError = new Error('custom')
    function factory() {
      return customError
    }
    const [error, data] = validate(z.string(), 123, factory)
    expect(data).toBeNull()
    expect(error).toBe(customError)
  })

  it('returns a TypeError when the factory returns a TypeError', () => {
    function factory(zodError: ZodError) {
      return new TypeError(`Bad type: ${zodError.issues.length} issue(s)`)
    }
    const [error, data] = validate(z.string(), 999, factory)
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(TypeError)
  })
})

describe('factory receives the ZodError', () => {
  it('passes the ZodError to the factory function', () => {
    const schema = z.object({ age: z.number(), name: z.string() })
    let capturedError: ZodError | null = null

    function factory(error: ZodError): Error {
      capturedError = error
      return new Error('test')
    }

    const [error, data] = validate(schema, {}, factory)
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)

    expect(capturedError).not.toBeNull()
    expect(capturedError!.issues).toBeDefined()
    expect(capturedError!.issues.length).toBe(2)
  })

  it('ZodError issues contain the expected paths', () => {
    const schema = z.object({ email: z.string().email() })
    let capturedError: ZodError | null = null

    function factory(error: ZodError): Error {
      capturedError = error
      return new Error('test')
    }

    const [error, data] = validate(schema, { email: 'bad' }, factory)
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)

    expect(capturedError).not.toBeNull()
    expect(capturedError!.issues[0]!.path).toEqual(['email'])
  })

  it('ZodError issues have empty path for root-level schema failures', () => {
    const schema = z.string()
    let capturedError: ZodError | null = null

    function factory(error: ZodError): Error {
      capturedError = error
      return new Error('test')
    }

    const [error, data] = validate(schema, 42, factory)
    expect(data).toBeNull()
    expect(error).toBeInstanceOf(Error)

    expect(capturedError).not.toBeNull()
    expect(capturedError!.issues[0]!.path).toEqual([])
  })
})

describe('validate() with various schema types', () => {
  it('validates z.enum', () => {
    const schema = z.enum(['a', 'b', 'c'])
    const [error1, data1] = validate(schema, 'b', defaultFactory)
    expect(error1).toBeNull()
    expect(data1).toBe('b')

    const [error2, data2] = validate(schema, 'd', defaultFactory)
    expect(data2).toBeNull()
    expect(error2).toBeInstanceOf(Error)
  })

  it('validates z.tuple', () => {
    const schema = z.tuple([z.string(), z.number()])
    const [error1, data1] = validate(schema, ['hi', 1], defaultFactory)
    expect(error1).toBeNull()
    expect(data1).toEqual(['hi', 1])

    const [error2, data2] = validate(schema, [1, 'hi'], defaultFactory)
    expect(data2).toBeNull()
    expect(error2).toBeInstanceOf(Error)
  })

  it('validates z.union', () => {
    const schema = z.union([z.string(), z.number()])
    const [error1, data1] = validate(schema, 'hello', defaultFactory)
    expect(error1).toBeNull()
    expect(data1).toBe('hello')

    const [error2, data2] = validate(schema, 42, defaultFactory)
    expect(error2).toBeNull()
    expect(data2).toBe(42)

    const [error3, data3] = validate(schema, true, defaultFactory)
    expect(data3).toBeNull()
    expect(error3).toBeInstanceOf(Error)
  })

  it('validates z.optional', () => {
    const schema = z.object({ bio: z.string().optional(), name: z.string() })
    const [error, data] = validate(schema, { name: 'Alice' }, defaultFactory)
    expect(error).toBeNull()
    expect(data).toEqual({ name: 'Alice' })
    expect(data!.bio).toBeUndefined()
  })

  it('validates z.record', () => {
    const schema = z.record(z.string(), z.number())
    const [error1, data1] = validate(schema, { left: 1, right: 2 }, defaultFactory)
    expect(error1).toBeNull()
    expect(data1).toEqual({ left: 1, right: 2 })

    const [error2, data2] = validate(schema, { left: 'not-a-number' }, defaultFactory)
    expect(data2).toBeNull()
    expect(error2).toBeInstanceOf(Error)
  })

  it('validates nested z.object', () => {
    const schema = z.object({
      user: z.object({
        address: z.object({
          city: z.string(),
        }),
        name: z.string(),
      }),
    })
    const input = { user: { address: { city: 'NYC' }, name: 'Bob' } }
    const [error, data] = validate(schema, input, defaultFactory)
    expect(error).toBeNull()
    expect(data).toEqual(input)
  })
})

describe('formatZodIssues()', () => {
  it('formats a single issue with path', () => {
    const issues = [{ message: 'Required', path: ['name'] }]
    const result = formatZodIssues(issues)
    expect(result.message).toBe('name: Required')
    expect(result.issues).toEqual([{ message: 'Required', path: 'name' }])
  })

  it('formats a single issue without path', () => {
    const issues = [{ message: 'Expected string, received number', path: [] as string[] }]
    const result = formatZodIssues(issues)
    expect(result.message).toBe('Expected string, received number')
  })

  it('joins nested paths with dots', () => {
    const issues = [{ message: 'Invalid email', path: ['user', 'email'] }]
    const result = formatZodIssues(issues)
    expect(result.message).toBe('user.email: Invalid email')
    expect(result.issues).toEqual([{ message: 'Invalid email', path: 'user.email' }])
  })

  it('joins multiple issues with the default separator', () => {
    const issues = [
      { message: 'Required', path: ['name'] },
      { message: 'Expected number', path: ['age'] },
    ]
    const result = formatZodIssues(issues)
    expect(result.message).toBe('name: Required\n  age: Expected number')
  })

  it('uses a custom separator', () => {
    const issues = [
      { message: 'Required', path: ['name'] },
      { message: 'Expected number', path: ['age'] },
    ]
    const result = formatZodIssues(issues, ', ')
    expect(result.message).toBe('name: Required, age: Expected number')
  })

  it('handles numeric path segments', () => {
    const issues = [{ message: 'Required', path: ['items', 0, 'value'] }]
    const result = formatZodIssues(issues)
    expect(result.message).toBe('items.0.value: Required')
  })

  it('returns empty string for empty issues array', () => {
    const result = formatZodIssues([])
    expect(result.message).toBe('')
    expect(result.issues).toEqual([])
  })
})
