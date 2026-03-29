import { describe, expect, it } from 'vitest'

import { useKeyBinding } from './use-key-binding.js'

describe('use-key-binding', () => {
  it('should export useKeyBinding as a function', () => {
    expect(typeof useKeyBinding).toBe('function')
  })
})
