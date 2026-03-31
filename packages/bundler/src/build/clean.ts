import { existsSync, readdirSync, rmSync } from 'node:fs'
import { extname, join } from 'node:path'

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
 * Check whether a filename looks like a compiled binary.
 *
 * Compiled binaries are either extensionless (unix) or `.exe` (windows).
 *
 * @param filename - The filename to check.
 * @returns `true` when the file has no extension or ends with `.exe`.
 */
export function isCompiledBinary(filename: string): boolean {
  const ext = extname(filename)
  return ext === '' || ext === '.exe'
}

/**
 * Remove kidd build artifacts (and compiled binaries when enabled) from the
 * output directory.
 *
 * Unlike a blanket `clean: true` which deletes the entire output
 * directory, this function targets only files with known build artifact
 * extensions (`.js`, `.mjs`, `.js.map`, `.mjs.map`). When `compile` is
 * true, compiled binaries (extensionless or `.exe`) are also removed.
 *
 * Only regular files and symbolic links are considered for removal.
 * Directories are always treated as foreign entries.
 *
 * @param params - The output directory and whether compile mode is active.
 * @returns A {@link CleanResult} describing what was removed and what was skipped.
 */
export function cleanBuildArtifacts(params: {
  readonly outDir: string
  readonly compile?: boolean
}): CleanResult {
  if (!existsSync(params.outDir)) {
    return { foreign: [], removed: [] }
  }

  const entries = readdirSync(params.outDir, { withFileTypes: true })

  return entries.reduce<{ readonly removed: string[]; readonly foreign: string[] }>(
    (acc, entry) => {
      const name = entry.name
      const isRemovable = entry.isFile() || entry.isSymbolicLink()
      const isArtifact = isBuildArtifact(name) || (!!params.compile && isCompiledBinary(name))
      if (isRemovable && isArtifact) {
        rmSync(join(params.outDir, name), { force: true })
        return { ...acc, removed: [...acc.removed, name] }
      }
      return { ...acc, foreign: [...acc.foreign, name] }
    },
    { foreign: [], removed: [] },
  )
}
