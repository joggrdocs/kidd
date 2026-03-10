import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { attempt } from '@kidd-cli/utils/fp'

import type { ProjectRoot } from './types.js'

const GITDIR_RE = /^gitdir:\s*(.+)$/
const MIN_MODULES_PARTS = 2

/**
 * Walk up the directory tree to find the nearest git project root.
 *
 * @param startDir - Directory to start searching from (defaults to cwd).
 * @returns The project root info, or null if no git root is found.
 */
export function findProjectRoot(startDir: string = process.cwd()): ProjectRoot | null {
  /**
   * Recursively walk up the directory tree searching for a `.git` marker.
   *
   * @private
   */
  const findRootRecursive = (currentDir: string, visited: Set<string>): ProjectRoot | null => {
    if (visited.has(currentDir)) {
      return null
    }
    const nextVisited = new Set([...visited, currentDir])

    const gitPath = join(currentDir, '.git')
    // Race condition: file may have been deleted between existsSync and statSync
    const [checkError, result] = attempt(() => checkGitPath(gitPath, currentDir))

    if (!checkError && result) {
      return result
    }

    const parent = dirname(currentDir)
    if (parent === currentDir) {
      return null
    }
    return findRootRecursive(parent, nextVisited)
  }

  return findRootRecursive(resolve(startDir), new Set())
}

/**
 * Check whether the current directory is inside a git submodule.
 *
 * @param startDir - Directory to start searching from.
 * @returns True if the directory is inside a submodule.
 */
export function isInSubmodule(startDir?: string): boolean {
  const projectRoot = findProjectRoot(startDir)
  if (!projectRoot) {
    return false
  }
  return projectRoot.isSubmodule
}

/**
 * Resolve the parent repository root when inside a git submodule.
 *
 * @param startDir - Directory to start searching from.
 * @returns The parent repository root path, or null.
 */
export function getParentRepoRoot(startDir?: string): string | null {
  const projectRoot = findProjectRoot(startDir)
  if (!projectRoot || !projectRoot.isSubmodule) {
    return null
  }

  const gitFilePath = join(projectRoot.path, '.git')
  const gitFileContent = readGitFile(gitFilePath)
  if (gitFileContent === null) {
    return null
  }

  return resolveParentGitDir(projectRoot, gitFileContent)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Read and trim the contents of a git-related file.
 *
 * @param filePath - The absolute file path to read.
 * @returns The trimmed file content, or null when the file cannot be read.
 * @private
 */
function readGitFile(filePath: string): string | null {
  const [error, content] = attempt(() => readFileSync(filePath, 'utf8'))
  if (error || content === null) {
    return null
  }
  return content.trim()
}

/**
 * Resolve a `.git` file reference to determine if this is a submodule.
 *
 * @private
 */
function resolveGitFileSubmodule(gitPath: string, currentDir: string): ProjectRoot | null {
  const gitFileContent = readGitFile(gitPath)
  if (gitFileContent === null) {
    return { isSubmodule: false, path: currentDir }
  }
  const gitDirMatch = gitFileContent.match(GITDIR_RE)
  if (gitDirMatch && gitDirMatch[1]) {
    const gitDir = resolve(currentDir, gitDirMatch[1])
    const isSubmodule = /[/\\]\.git[/\\]modules[/\\]/.test(gitDir)
    return { isSubmodule, path: currentDir }
  }
  return null
}

/**
 * Check whether a `.git` path is a directory or file and resolve accordingly.
 *
 * @private
 */
function checkGitPath(gitPath: string, currentDir: string): ProjectRoot | null {
  if (!existsSync(gitPath)) {
    return null
  }

  const stats = statSync(gitPath)
  if (stats.isDirectory()) {
    return { isSubmodule: false, path: currentDir }
  }

  if (stats.isFile()) {
    return resolveGitFileSubmodule(gitPath, currentDir)
  }

  return null
}

/**
 * Extract the parent repository root from a resolved git modules path.
 *
 * @private
 */
function resolveParentFromGitDir(resolvedGitDir: string): string | null {
  const gitDirParts = resolvedGitDir.split('/modules/')
  if (gitDirParts.length >= MIN_MODULES_PARTS) {
    const [parentGitDir] = gitDirParts
    if (parentGitDir && parentGitDir.endsWith('.git')) {
      return dirname(parentGitDir)
    }
  }
  return null
}

/**
 * Resolve the parent repository root from a submodule's gitdir reference.
 *
 * @private
 */
function resolveParentGitDir(projectRoot: ProjectRoot, gitFileContent: string): string | null {
  const gitDirMatch = gitFileContent.match(GITDIR_RE)
  if (!gitDirMatch) {
    return null
  }

  const gitDir = gitDirMatch[1] ?? ''
  const resolvedGitDir = resolve(projectRoot.path, gitDir)

  if (process.platform === 'win32') {
    return null
  }

  return resolveParentFromGitDir(resolvedGitDir)
}
