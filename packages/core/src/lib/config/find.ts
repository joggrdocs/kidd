import { join } from 'node:path'

import { fileExists } from '@kidd-cli/utils/fs'

import { findProjectRoot } from '@/lib/project/index.js'

import { DOTFILE_EXTENSIONS } from './constants.js'

/**
 * Generate dotfile config names used as a fallback when c12 finds nothing.
 *
 * Produces names like `.myapp.json`, `.myapp.jsonc`, `.myapp.yaml`.
 *
 * @param name - The CLI name used to derive config file names.
 * @returns An array of dotfile config file names.
 */
export function getDotfileNames(name: string): string[] {
  return DOTFILE_EXTENSIONS.map((ext) => `.${name}${ext}`)
}

/**
 * Search for a dotfile config across multiple directories.
 *
 * Searches in order: explicit search paths, the current working directory,
 * and the project root (if different from cwd). Returns the path of the
 * first matching file found.
 *
 * @param options - Search options including cwd, file names, and optional search paths.
 * @returns The full path to the config file, or null if not found.
 */
export async function findDotfileConfig(options: {
  cwd: string
  fileNames: string[]
  searchPaths?: string[]
}): Promise<string | null> {
  const { fileNames, cwd, searchPaths } = options

  if (searchPaths) {
    const searchResults = await Promise.all(
      searchPaths.map((dir) => findConfigFile(dir, fileNames))
    )
    const found = searchResults.find((result): result is string => result !== null)
    if (found) {
      return found
    }
  }

  const fromCwd = await findConfigFile(cwd, fileNames)
  if (fromCwd) {
    return fromCwd
  }

  const projectRoot = findProjectRoot(cwd)
  if (projectRoot && projectRoot.path !== cwd) {
    const fromRoot = await findConfigFile(projectRoot.path, fileNames)
    if (fromRoot) {
      return fromRoot
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Search a single directory for the first matching config file name.
 *
 * @param dir - The directory to search in.
 * @param fileNames - Candidate config file names to look for.
 * @returns The full path to the first matching config file, or null if none found.
 * @private
 */
async function findConfigFile(dir: string, fileNames: readonly string[]): Promise<string | null> {
  const results = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = join(dir, fileName)
      const exists = await fileExists(filePath)
      if (exists) {
        return filePath
      }
      return null
    })
  )
  const found = results.find((result): result is string => result !== null)
  return found ?? null
}
