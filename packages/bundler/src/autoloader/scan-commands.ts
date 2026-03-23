import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import type { ScanResult, ScannedDir, ScannedFile } from '../types.js'

const VALID_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.tsx', '.jsx'])
const INDEX_NAME = 'index'

/**
 * Scan a commands directory and produce a tree structure for static code generation.
 *
 * Mirrors the runtime autoloader's rules: valid extensions are `.ts`, `.js`, `.mjs`;
 * files and directories starting with `_` or `.` are skipped; `index` files in
 * subdirectories become parent command handlers.
 *
 * @param dir - Absolute path to the commands directory.
 * @returns A tree of scanned files and directories.
 */
export async function scanCommandsDir(dir: string): Promise<ScanResult> {
  const entries = await readdir(dir, { withFileTypes: true })

  const files = entries.filter(isCommandFile).map((entry) => toScannedFile(dir, entry))

  const dirs = await Promise.all(
    entries.filter(isCommandDir).map((entry) => scanSubDir(join(dir, entry.name)))
  )

  return { dirs, files }
}

// ---------------------------------------------------------------------------

/**
 * Recursively scan a subdirectory into a ScannedDir.
 *
 * @private
 * @param dir - Absolute path to the subdirectory.
 * @returns A ScannedDir representing the directory and its contents.
 */
async function scanSubDir(dir: string): Promise<ScannedDir> {
  const name = basename(dir)
  const entries = await readdir(dir, { withFileTypes: true })
  const indexEntry = findIndexEntry(entries)

  const files = entries.filter(isCommandFile).map((entry) => toScannedFile(dir, entry))

  const dirs = await Promise.all(
    entries.filter(isCommandDir).map((entry) => scanSubDir(join(dir, entry.name)))
  )

  return {
    dirs,
    files,
    index: resolveIndexPath(dir, indexEntry),
    name,
  }
}

/**
 * Convert a directory entry into a ScannedFile.
 *
 * @private
 * @param dir - Parent directory absolute path.
 * @param entry - The directory entry for the file.
 * @returns A ScannedFile with name and absolute file path.
 */
function toScannedFile(dir: string, entry: Dirent): ScannedFile {
  return {
    filePath: join(dir, entry.name),
    name: basename(entry.name, extname(entry.name)),
  }
}

/**
 * Find the index file entry among a list of directory entries.
 *
 * @private
 * @param entries - The directory entries to search.
 * @returns The Dirent for the index file, or undefined.
 */
function findIndexEntry(entries: readonly Dirent[]): Dirent | undefined {
  return entries.find(
    (entry) =>
      entry.isFile() &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.d.tsx') &&
      VALID_EXTENSIONS.has(extname(entry.name)) &&
      basename(entry.name, extname(entry.name)) === INDEX_NAME
  )
}

/**
 * Predicate: entry is a valid command file (not index, not hidden/private).
 *
 * @private
 * @param entry - The directory entry to check.
 * @returns True when the entry is a scannable command file.
 */
function isCommandFile(entry: Dirent): boolean {
  if (!entry.isFile()) {
    return false
  }
  if (entry.name.startsWith('_') || entry.name.startsWith('.')) {
    return false
  }
  if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.tsx')) {
    return false
  }
  if (!VALID_EXTENSIONS.has(extname(entry.name))) {
    return false
  }
  return basename(entry.name, extname(entry.name)) !== INDEX_NAME
}

/**
 * Predicate: entry is a scannable command directory (not hidden/private).
 *
 * @private
 * @param entry - The directory entry to check.
 * @returns True when the entry is a scannable command directory.
 */
function isCommandDir(entry: Dirent): boolean {
  if (!entry.isDirectory()) {
    return false
  }
  return !entry.name.startsWith('_') && !entry.name.startsWith('.')
}

/**
 * Resolve the absolute path to an index file entry, or undefined.
 *
 * @private
 * @param dir - The parent directory absolute path.
 * @param entry - The index file Dirent, or undefined.
 * @returns The absolute path to the index file, or undefined.
 */
function resolveIndexPath(dir: string, entry: Dirent | undefined): string | undefined {
  if (!entry) {
    return undefined
  }
  return join(dir, entry.name)
}
