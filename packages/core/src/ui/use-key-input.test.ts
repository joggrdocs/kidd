import { describe, expect, it } from 'vitest'

import { useKeyInput } from './use-key-input.js'

describe('use-key-input', () => {
  it('should export useKeyInput as a function', () => {
    expect(typeof useKeyInput).toBe('function')
  })
})
