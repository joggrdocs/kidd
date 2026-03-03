import { access } from 'node:fs/promises'
import { join } from 'node:path'

import { attemptAsync } from '@kidd/utils/fp'

import { findProjectRoot } from '@/lib/project/index.js'

import { CONFIG_EXTENSIONS } from './constants.js'

/**
 * Generate the list of config file names to search for based on the CLI name.
 *
 * Produces names like `.myapp.jsonc`, `.myapp.json`, `.myapp.yaml` from the
 * supported extension list.
 *
 * @param name - The CLI name used to derive config file names.
 * @returns An array of config file names to search for.
 */
export function getConfigFileNames(name: string): string[] {
  return CONFIG_EXTENSIONS.map((ext) => `.${name}${ext}`)
}

/**
 * Check whether a file exists at the given path.
 *
 * @param filePath - The absolute file path to check.
 * @returns True when the file exists and is accessible.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const [error] = await attemptAsync(() => access(filePath))
  return !error
}

/**
 * Search a single directory for the first matching config file name.
 *
 * Checks each candidate file name in order and returns the path of the first
 * one that exists on disk.
 *
 * @param dir - The directory to search in.
 * @param fileNames - Candidate config file names to look for.
 * @returns The full path to the first matching config file, or null if none found.
 */
export async function findConfigFile(
  dir: string,
  fileNames: readonly string[]
): Promise<string | null> {
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

/**
 * Search for a config file across multiple directories.
 *
 * Searches in order: explicit search paths, the current working directory,
 * and the project root (if different from cwd). Returns the path of the
 * first matching file found.
 *
 * @param options - Search options including cwd, file names, and optional search paths.
 * @returns The full path to the config file, or null if not found.
 */
export async function findConfig(options: {
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
