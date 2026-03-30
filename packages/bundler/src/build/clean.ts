import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { BUILD_ARTIFACT_EXTENSIONS } from '../constants.js'

/**
 * Result of a targeted clean operation.
 */
export interface CleanResult {
  /** Files that were removed. */
  readonly removed: readonly string[]
  /** Files that were not removed because they are not build artifacts. */
  readonly foreign: readonly string[]
}

/**
 * Check whether a filename matches a known build artifact extension.
 *
 * @param filename - The filename to check.
 * @returns `true` when the file ends with a known build artifact extension.
 */
export function isBuildArtifact(filename: string): boolean {
  return BUILD_ARTIFACT_EXTENSIONS.some((ext) => filename.endsWith(ext))
}

/**
 * Remove only kidd build artifacts from the output directory.
 *
 * Unlike tsdown's built-in `clean: true` which deletes the entire output
 * directory, this function targets only files with known build artifact
 * extensions (`.js`, `.mjs`, `.js.map`, `.mjs.map`). Foreign files are
 * left in place and returned so the caller can warn.
 *
 * Only regular files and symbolic links are considered for removal.
 * Directories (even if their name matches an artifact extension) are
 * treated as foreign entries.
 *
 * @param outDir - Absolute path to the build output directory.
 * @returns A {@link CleanResult} describing what was removed and what was skipped.
 */
export function cleanBuildArtifacts(outDir: string): CleanResult {
  if (!existsSync(outDir)) {
    return { foreign: [], removed: [] }
  }

  const entries = readdirSync(outDir, { withFileTypes: true })

  return entries.reduce<{ readonly removed: string[]; readonly foreign: string[] }>(
    (acc, entry) => {
      const name = entry.name
      if ((entry.isFile() || entry.isSymbolicLink()) && isBuildArtifact(name)) {
        rmSync(join(outDir, name), { force: true })
        return { ...acc, removed: [...acc.removed, name] }
      }
      return { ...acc, foreign: [...acc.foreign, name] }
    },
    { foreign: [], removed: [] },
  )
}
