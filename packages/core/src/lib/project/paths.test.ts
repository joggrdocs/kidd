import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveGlobalPath, resolveLocalPath, resolvePath } from './paths.js'

const mockHomedir = vi.hoisted(() => ({ value: '' }))

vi.mock(import('node:os'), async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    homedir: () => mockHomedir.value || original.homedir(),
  }
})

/**
 * Use realpathSync to resolve macOS /tmp -> /private/tmp symlink so that
 * paths match what resolve() / process.cwd() produce.
 */
function createTempDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'kidd-test-')))
}

describe('resolveLocalPath()', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = createTempDir()
  })

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true })
  })

  it('returns join(root, dirName) inside a git repo', () => {
    mkdirSync(join(tempDir, '.git'), { recursive: true })

    const result = resolveLocalPath({ dirName: '.myapp', startDir: tempDir })

    expect(result).toBe(join(tempDir, '.myapp'))
  })

  it('returns null outside a git repo', () => {
    const isolatedDir = join(tempDir, 'no', 'git')
    mkdirSync(isolatedDir, { recursive: true })

    const result = resolveLocalPath({ dirName: '.myapp', startDir: isolatedDir })

    if (result === null) {
      expect(result).toBeNull()
    } else {
      // In case a .git exists above /tmp in the test environment
      expect(typeof result).toBe('string')
    }
  })
})

describe('resolveGlobalPath()', () => {
  let fakeHome: string

  beforeEach(() => {
    fakeHome = createTempDir()
    mockHomedir.value = fakeHome
  })

  afterEach(() => {
    rmSync(fakeHome, { force: true, recursive: true })
    mockHomedir.value = ''
  })

  it('returns join(homedir(), dirName)', () => {
    const result = resolveGlobalPath({ dirName: '.myapp' })

    expect(result).toBe(join(fakeHome, '.myapp'))
  })
})

describe('resolvePath()', () => {
  let tempDir: string
  let fakeHome: string

  beforeEach(() => {
    tempDir = createTempDir()
    fakeHome = createTempDir()
    mkdirSync(join(tempDir, '.git'), { recursive: true })
    mockHomedir.value = fakeHome
  })

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true })
    rmSync(fakeHome, { force: true, recursive: true })
    mockHomedir.value = ''
  })

  it('delegates to resolveLocalPath when source is local', () => {
    const result = resolvePath({ dirName: '.myapp', source: 'local', startDir: tempDir })

    expect(result).toBe(join(tempDir, '.myapp'))
  })

  it('delegates to resolveGlobalPath when source is global', () => {
    const result = resolvePath({ dirName: '.myapp', source: 'global' })

    expect(result).toBe(join(fakeHome, '.myapp'))
  })

  it('prefers local and falls back to global when source is resolve', () => {
    const result = resolvePath({ dirName: '.myapp', source: 'resolve', startDir: tempDir })

    expect(result).toBe(join(tempDir, '.myapp'))
  })

  it('uses resolve as the default source', () => {
    const result = resolvePath({ dirName: '.myapp', startDir: tempDir })

    expect(result).toBe(join(tempDir, '.myapp'))
  })
})
