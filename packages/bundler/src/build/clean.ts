import { extname, join } from 'node:path'

import { fs } from '@kidd-cli/utils/node'

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
 * @param params - The output directory and whether compile mode is active.
 * @returns A {@link CleanResult} describing what was removed and what was skipped.
 */
export async function clean(params: {
  readonly outDir: string
  readonly compile?: boolean
}): Promise<CleanResult> {
  const dirExists = await fs.exists(params.outDir)
  if (!dirExists) {
    return { foreign: [], removed: [] }
  }

  const [listError, entries] = await fs.list(params.outDir)
  if (listError) {
    return { foreign: [], removed: [] }
  }

  const results = await Promise.all(
    entries.map(async (name) => {
      const isArtifact = isBuildArtifact(name) || (!!params.compile && isCompiledBinary(name))
      if (isArtifact) {
        await fs.remove(join(params.outDir, name))
        return { type: 'removed' as const, name }
      }
      return { type: 'foreign' as const, name }
    })
  )

  return {
    removed: results.filter((r) => r.type === 'removed').map((r) => r.name),
    foreign: results.filter((r) => r.type === 'foreign').map((r) => r.name),
  }
}
