import { describe, expect, it } from 'vitest'

import { isKebabCase } from './validate.js'

describe('isKebabCase', () => {
  it('should return true for my-cli', () => {
    expect(isKebabCase('my-cli')).toBe(true)
  })

  it('should return true for single character a', () => {
    expect(isKebabCase('a')).toBe(true)
  })

  it('should return true for hello-world', () => {
    expect(isKebabCase('hello-world')).toBe(true)
  })

  it('should return true for cli2', () => {
    expect(isKebabCase('cli2')).toBe(true)
  })

  it('should return true for a1b', () => {
    expect(isKebabCase('a1b')).toBe(true)
  })

  it('should return false for uppercase letters', () => {
    expect(isKebabCase('My-Cli')).toBe(false)
  })

  it('should return false for string with spaces', () => {
    expect(isKebabCase('my cli')).toBe(false)
  })

  it('should return false for trailing dash', () => {
    expect(isKebabCase('my-')).toBe(false)
  })

  it('should return false for double dash', () => {
    expect(isKebabCase('my--cli')).toBe(false)
  })

  it('should return false when starting with a number', () => {
    expect(isKebabCase('1abc')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isKebabCase('')).toBe(false)
  })

  it('should return false for underscore', () => {
    expect(isKebabCase('hello_world')).toBe(false)
  })

  it('should return false when starting with a dash', () => {
    expect(isKebabCase('-foo')).toBe(false)
  })
})
