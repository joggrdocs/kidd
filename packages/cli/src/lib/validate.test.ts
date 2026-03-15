import { describe, expect, it } from 'vitest'

import { isKebabCase } from './validate.js'

describe(isKebabCase, () => {
  it('should return true for my-cli', () => {
    expect(isKebabCase('my-cli')).toBeTruthy()
  })

  it('should return true for single character a', () => {
    expect(isKebabCase('a')).toBeTruthy()
  })

  it('should return true for hello-world', () => {
    expect(isKebabCase('hello-world')).toBeTruthy()
  })

  it('should return true for cli2', () => {
    expect(isKebabCase('cli2')).toBeTruthy()
  })

  it('should return true for a1b', () => {
    expect(isKebabCase('a1b')).toBeTruthy()
  })

  it('should return false for uppercase letters', () => {
    expect(isKebabCase('My-Cli')).toBeFalsy()
  })

  it('should return false for string with spaces', () => {
    expect(isKebabCase('my cli')).toBeFalsy()
  })

  it('should return false for trailing dash', () => {
    expect(isKebabCase('my-')).toBeFalsy()
  })

  it('should return false for double dash', () => {
    expect(isKebabCase('my--cli')).toBeFalsy()
  })

  it('should return false when starting with a number', () => {
    expect(isKebabCase('1abc')).toBeFalsy()
  })

  it('should return false for empty string', () => {
    expect(isKebabCase('')).toBeFalsy()
  })

  it('should return false for underscore', () => {
    expect(isKebabCase('hello_world')).toBeFalsy()
  })

  it('should return false when starting with a dash', () => {
    expect(isKebabCase('-foo')).toBeFalsy()
  })
})
