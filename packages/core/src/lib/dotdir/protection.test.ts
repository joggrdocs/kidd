import { describe, expect, it } from 'vitest'

import { createProtectionRegistry } from './protection.js'

describe('createProtectionRegistry()', () => {
  it('should return false for an entry that was not added', () => {
    const registry = createProtectionRegistry()

    expect(registry.has('global', 'auth.json')).toBe(false)
  })

  it('should return true after adding an entry', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })

    expect(registry.has('global', 'auth.json')).toBe(true)
  })

  it('should distinguish between locations for the same filename', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })

    expect(registry.has('global', 'auth.json')).toBe(true)
    expect(registry.has('local', 'auth.json')).toBe(false)
  })

  it('should distinguish between filenames for the same location', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })

    expect(registry.has('global', 'auth.json')).toBe(true)
    expect(registry.has('global', 'config.json')).toBe(false)
  })

  it('should handle multiple entries', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })
    registry.add({ filename: 'secrets.json', location: 'local' })

    expect(registry.has('global', 'auth.json')).toBe(true)
    expect(registry.has('local', 'secrets.json')).toBe(true)
    expect(registry.has('global', 'secrets.json')).toBe(false)
    expect(registry.has('local', 'auth.json')).toBe(false)
  })

  it('should be idempotent when adding the same entry twice', () => {
    const registry = createProtectionRegistry()

    registry.add({ filename: 'auth.json', location: 'global' })
    registry.add({ filename: 'auth.json', location: 'global' })

    expect(registry.has('global', 'auth.json')).toBe(true)
  })
})
