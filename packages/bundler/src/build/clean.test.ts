import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { cleanBuildArtifacts, isBuildArtifact } from './clean.js'

describe('isBuildArtifact', () => {
  it('should match .js files', () => {
    expect(isBuildArtifact('index.js')).toBe(true)
  })

  it('should match .mjs files', () => {
    expect(isBuildArtifact('index.mjs')).toBe(true)
  })

  it('should match .js.map files', () => {
    expect(isBuildArtifact('index.js.map')).toBe(true)
  })

  it('should match .mjs.map files', () => {
    expect(isBuildArtifact('index.mjs.map')).toBe(true)
  })

  it('should not match non-artifact files', () => {
    expect(isBuildArtifact('README.md')).toBe(false)
  })

  it('should not match compiled binaries', () => {
    expect(isBuildArtifact('cli-darwin-arm64')).toBe(false)
  })
})

describe('cleanBuildArtifacts', () => {
  const testDir = join(tmpdir(), `kidd-clean-test-${Date.now()}`)

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { force: true, recursive: true })
  })

  it('should return empty result for non-existent directory', () => {
    const result = cleanBuildArtifacts('/non/existent/path')

    expect(result.removed).toStrictEqual([])
    expect(result.foreign).toStrictEqual([])
  })

  it('should remove build artifacts', () => {
    writeFileSync(join(testDir, 'index.js'), '')
    writeFileSync(join(testDir, 'index.js.map'), '')

    const result = cleanBuildArtifacts(testDir)

    expect(result.removed).toContain('index.js')
    expect(result.removed).toContain('index.js.map')
    expect(existsSync(join(testDir, 'index.js'))).toBe(false)
    expect(existsSync(join(testDir, 'index.js.map'))).toBe(false)
  })

  it('should preserve foreign files and report them', () => {
    writeFileSync(join(testDir, 'index.js'), '')
    writeFileSync(join(testDir, 'README.md'), '')
    writeFileSync(join(testDir, 'cli-darwin-arm64'), '')

    const result = cleanBuildArtifacts(testDir)

    expect(result.removed).toContain('index.js')
    expect(result.foreign).toContain('README.md')
    expect(result.foreign).toContain('cli-darwin-arm64')
    expect(existsSync(join(testDir, 'README.md'))).toBe(true)
    expect(existsSync(join(testDir, 'cli-darwin-arm64'))).toBe(true)
  })

  it('should return empty result for empty directory', () => {
    const result = cleanBuildArtifacts(testDir)

    expect(result.removed).toStrictEqual([])
    expect(result.foreign).toStrictEqual([])
  })
})
