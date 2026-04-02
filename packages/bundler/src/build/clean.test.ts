import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { clean, isBuildArtifact, isCompiledBinary } from './clean.js'

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

describe('isCompiledBinary', () => {
  it('should match extensionless files', () => {
    expect(isCompiledBinary('cli-darwin-arm64')).toBe(true)
  })

  it('should match .exe files', () => {
    expect(isCompiledBinary('cli-windows-x64.exe')).toBe(true)
  })

  it('should not match .js files', () => {
    expect(isCompiledBinary('index.js')).toBe(false)
  })

  it('should not match .md files', () => {
    expect(isCompiledBinary('README.md')).toBe(false)
  })
})

describe('clean', () => {
  const testDir = join(tmpdir(), `kidd-clean-test-${Date.now()}`)

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { force: true, recursive: true })
  })

  it('should return empty result for non-existent directory', async () => {
    const result = await clean({ outDir: '/non/existent/path' })

    expect(result.removed).toStrictEqual([])
    expect(result.foreign).toStrictEqual([])
  })

  it('should remove build artifacts', async () => {
    writeFileSync(join(testDir, 'index.js'), '')
    writeFileSync(join(testDir, 'index.js.map'), '')

    const result = await clean({ outDir: testDir })

    expect(result.removed).toContain('index.js')
    expect(result.removed).toContain('index.js.map')
    expect(existsSync(join(testDir, 'index.js'))).toBe(false)
    expect(existsSync(join(testDir, 'index.js.map'))).toBe(false)
  })

  it('should preserve foreign files and report them', async () => {
    writeFileSync(join(testDir, 'index.js'), '')
    writeFileSync(join(testDir, 'README.md'), '')
    writeFileSync(join(testDir, 'cli-darwin-arm64'), '')

    const result = await clean({ outDir: testDir })

    expect(result.removed).toContain('index.js')
    expect(result.foreign).toContain('README.md')
    expect(result.foreign).toContain('cli-darwin-arm64')
    expect(existsSync(join(testDir, 'README.md'))).toBe(true)
    expect(existsSync(join(testDir, 'cli-darwin-arm64'))).toBe(true)
  })

  it('should remove compiled binaries when compile is true', async () => {
    writeFileSync(join(testDir, 'index.mjs'), '')
    writeFileSync(join(testDir, 'cli-darwin-arm64'), '')
    writeFileSync(join(testDir, 'cli-linux-x64'), '')
    writeFileSync(join(testDir, 'cli-windows-x64.exe'), '')
    writeFileSync(join(testDir, 'README.md'), '')

    const result = await clean({ compile: true, outDir: testDir })

    expect(result.removed).toContain('index.mjs')
    expect(result.removed).toContain('cli-darwin-arm64')
    expect(result.removed).toContain('cli-linux-x64')
    expect(result.removed).toContain('cli-windows-x64.exe')
    expect(result.foreign).toContain('README.md')
    expect(existsSync(join(testDir, 'index.mjs'))).toBe(false)
    expect(existsSync(join(testDir, 'cli-darwin-arm64'))).toBe(false)
    expect(existsSync(join(testDir, 'cli-linux-x64'))).toBe(false)
    expect(existsSync(join(testDir, 'cli-windows-x64.exe'))).toBe(false)
    expect(existsSync(join(testDir, 'README.md'))).toBe(true)
  })

  it('should return empty result for empty directory', async () => {
    const result = await clean({ outDir: testDir })

    expect(result.removed).toStrictEqual([])
    expect(result.foreign).toStrictEqual([])
  })
})
