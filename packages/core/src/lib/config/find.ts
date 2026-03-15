import { join } from 'node:path'

import { fileExists } from '@kidd-cli/utils/fs'

import { findProjectRoot } from '@/lib/project/index.js'

import { DOTFILE_EXTENSIONS } from './constants.js'
import type { FindConfigFileOptions, FindDotfileOptions } from './types.js'

/**
 * Generate dotfile config names used as a fallback when c12 finds nothing.
 *
 * Produces names like `.myapp.json`, `.myapp.jsonc`, `.myapp.yaml`.
 *
 * @param name - The CLI name used to derive config file names.
 * @returns An array of dotfile config file names.
 */
export function getDotfileNames(name: string): readonly string[] {
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
export async function findDotfileConfig(options: FindDotfileOptions): Promise<string | null> {
  const { fileNames, cwd, searchPaths } = options

  if (searchPaths) {
    const searchResults = await Promise.all(
      searchPaths.map((dir) => findConfigFile({ dir, fileNames }))
    )
    const found = searchResults.find((result): result is string => result !== null)
    if (found) {
      return found
    }
  }

  const fromCwd = await findConfigFile({ dir: cwd, fileNames })
  if (fromCwd) {
    return fromCwd
  }

  const projectRoot = findProjectRoot(cwd)
  if (projectRoot && projectRoot.path !== cwd) {
    const fromRoot = await findConfigFile({ dir: projectRoot.path, fileNames })
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
 * Checks each candidate file name in order and returns the path of the first
 * one that exists on disk.
 *
 * @param options - The directory and candidate file names to search.
 * @returns The full path to the first matching config file, or null if none found.
 * @private
 */
async function findConfigFile(options: FindConfigFileOptions): Promise<string | null> {
  const { dir, fileNames } = options
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
