import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { findProjectRoot, getParentRepoRoot, isInSubmodule } from './root.js'

/**
 * Use realpathSync to resolve macOS /tmp -> /private/tmp symlink so that
 * paths match what resolve() / process.cwd() produce.
 */
function createTempDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'kidd-test-')))
}

/**
 * Creates a submodule directory structure inside a parent repo
 * and returns the submodule dir path.
 */
function createSubmoduleStructure(parentRepo: string, moduleName: string): string {
  mkdirSync(join(parentRepo, '.git', 'modules', moduleName), { recursive: true })
  const submoduleDir = join(parentRepo, moduleName)
  mkdirSync(submoduleDir, { recursive: true })
  const relativeGitDir = join('..', '.git', 'modules', moduleName)
  writeFileSync(join(submoduleDir, '.git'), `gitdir: ${relativeGitDir}`)
  return submoduleDir
}

/**
 * Creates a fake submodule with a gitdir pointing to a non-.git directory,
 * simulating an unexpected gitdir pattern.
 */
function createNonStandardGitdirStructure(
  parentRepo: string,
  gitDirName: string,
  moduleName: string
): string {
  const oddPath = join(parentRepo, gitDirName, 'modules', moduleName)
  mkdirSync(oddPath, { recursive: true })
  const submoduleDir = join(parentRepo, moduleName)
  mkdirSync(submoduleDir, { recursive: true })
  const relativeGitDir = join('..', gitDirName, 'modules', moduleName)
  writeFileSync(join(submoduleDir, '.git'), `gitdir: ${relativeGitDir}`)
  return submoduleDir
}

/**
 * Runs callback with the target file made unreadable, restoring permissions
 * in a finally block.
 */
function withUnreadableFile(filePath: string, callback: () => void): void {
  chmodSync(filePath, 0o000)
  try {
    callback()
  } finally {
    chmodSync(filePath, 0o644)
  }
}

describe('findProjectRoot()', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = createTempDir()
  })

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true })
  })

  it('finds a .git directory and returns isSubmodule false', () => {
    mkdirSync(join(tempDir, '.git'), { recursive: true })

    const result = findProjectRoot(tempDir)

    expect(result).not.toBeNull()
    expect(result!.path).toBe(tempDir)
    expect(result!.isSubmodule).toBeFalsy()
  })

  it('detects submodules via .git file with gitdir pointing to modules path', () => {
    const parentDir = createTempDir()
    try {
      const submoduleDir = createSubmoduleStructure(parentDir, 'mymod')

      const result = findProjectRoot(submoduleDir)

      expect(result).not.toBeNull()
      expect(result!.path).toBe(submoduleDir)
      expect(result!.isSubmodule).toBeTruthy()
    } finally {
      rmSync(parentDir, { force: true, recursive: true })
    }
  })

  it('returns null when no .git is found', () => {
    const isolatedDir = mkdtempSync(join(tmpdir(), 'no-git-'))

    try {
      const result = findProjectRoot(isolatedDir)

      if (result !== null) {
        console.warn('Skipping assertion: .git found above temp directory')
        return
      }
      expect(result).toBeNull()
    } finally {
      rmSync(isolatedDir, { force: true, recursive: true })
    }
  })

  it('traverses up directories to find .git in parent', () => {
    mkdirSync(join(tempDir, '.git'), { recursive: true })
    const childDir = join(tempDir, 'src', 'lib')
    mkdirSync(childDir, { recursive: true })

    const result = findProjectRoot(childDir)

    expect(result).not.toBeNull()
    expect(result!.path).toBe(tempDir)
    expect(result!.isSubmodule).toBeFalsy()
  })

  it('handles .git file without gitdir match (random content)', () => {
    const isolatedDir = realpathSync(mkdtempSync(join(tmpdir(), 'random-git-')))

    try {
      writeFileSync(join(isolatedDir, '.git'), 'some random content that is not a gitdir reference')

      const result = findProjectRoot(isolatedDir)

      // .git file with non-gitdir content returns null for that dir, traverses up
      if (result !== null) {
        console.warn('Skipping assertion: .git found above temp directory')
        return
      }
      expect(result).toBeNull()
    } finally {
      rmSync(isolatedDir, { force: true, recursive: true })
    }
  })

  it('handles read errors gracefully when .git file cannot be read', () => {
    if (process.platform === 'win32') {
      return
    }

    writeFileSync(join(tempDir, '.git'), 'gitdir: some/path')
    chmodSync(join(tempDir, '.git'), 0o000)

    try {
      const result = findProjectRoot(tempDir)
      expect(result).not.toBeNull()
      expect(result!.path).toBe(tempDir)
      expect(result!.isSubmodule).toBeFalsy()
    } finally {
      chmodSync(join(tempDir, '.git'), 0o644)
    }
  })

  it('detects non-submodule .git file with gitdir not in modules path', () => {
    const worktreeGitDir = join(tempDir, '.git-worktrees', 'feature')
    mkdirSync(worktreeGitDir, { recursive: true })
    const worktreeDir = join(tempDir, 'worktree-checkout')
    mkdirSync(worktreeDir, { recursive: true })

    writeFileSync(join(worktreeDir, '.git'), `gitdir: ${worktreeGitDir}`)

    const result = findProjectRoot(worktreeDir)

    expect(result).not.toBeNull()
    expect(result!.path).toBe(worktreeDir)
    expect(result!.isSubmodule).toBeFalsy()
  })
})

describe('isInSubmodule()', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = createTempDir()
  })

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true })
  })

  it('returns false for regular repos', () => {
    mkdirSync(join(tempDir, '.git'), { recursive: true })

    const result = isInSubmodule(tempDir)

    expect(result).toBeFalsy()
  })

  it('returns true for submodules', () => {
    const parentDir = createTempDir()
    try {
      mkdirSync(join(parentDir, '.git', 'modules', 'sub'), { recursive: true })

      const submoduleDir = join(parentDir, 'sub')
      mkdirSync(submoduleDir, { recursive: true })

      writeFileSync(join(submoduleDir, '.git'), `gitdir: ${join('..', '.git', 'modules', 'sub')}`)

      const result = isInSubmodule(submoduleDir)

      expect(result).toBeTruthy()
    } finally {
      rmSync(parentDir, { force: true, recursive: true })
    }
  })

  it('returns false when no project root found', () => {
    const isolatedDir = join(tempDir, 'deep', 'nested', 'path')
    mkdirSync(isolatedDir, { recursive: true })

    const result = isInSubmodule(isolatedDir)

    expect(result).toBeFalsy()
  })
})

describe('getParentRepoRoot()', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = createTempDir()
  })

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true })
  })

  it('returns null for non-submodule repos', () => {
    mkdirSync(join(tempDir, '.git'), { recursive: true })

    const result = getParentRepoRoot(tempDir)

    expect(result).toBeNull()
  })

  it('returns parent repo root for submodules', () => {
    if (process.platform === 'win32') {
      return
    }

    const parentRepo = createTempDir()
    try {
      const submoduleDir = createSubmoduleStructure(parentRepo, 'sub')

      const result = getParentRepoRoot(submoduleDir)

      expect(result).toBe(parentRepo)
    } finally {
      rmSync(parentRepo, { force: true, recursive: true })
    }
  })

  it('returns null when .git file cannot be read', () => {
    if (process.platform === 'win32') {
      return
    }

    const parentRepo = createTempDir()
    try {
      const submoduleDir = createSubmoduleStructure(parentRepo, 'sub')

      withUnreadableFile(join(submoduleDir, '.git'), () => {
        const result = getParentRepoRoot(submoduleDir)
        expect(result).toBeNull()
      })
    } finally {
      rmSync(parentRepo, { force: true, recursive: true })
    }
  })

  it("returns null when gitdir doesn't match expected pattern", () => {
    if (process.platform === 'win32') {
      return
    }

    const parentRepo = createTempDir()
    try {
      const submoduleDir = createNonStandardGitdirStructure(parentRepo, 'not-a-git-dir', 'sub')
      const result = getParentRepoRoot(submoduleDir)
      expect(result).toBeNull()
    } finally {
      rmSync(parentRepo, { force: true, recursive: true })
    }
  })

  it('returns null when no project root is found', () => {
    const isolatedDir = join(tempDir, 'no', 'git', 'here')
    mkdirSync(isolatedDir, { recursive: true })

    const result = getParentRepoRoot(isolatedDir)

    expect(result).toBeNull()
  })
})
