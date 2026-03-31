import { describe, expect, it } from 'vitest'

import { useInput } from './use-input.js'

describe('use-input', () => {
  it('should export useInput as a function', () => {
    expect(typeof useInput).toBe('function')
  })
})
