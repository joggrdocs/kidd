import { access } from 'node:fs/promises'

import { attemptAsync } from 'es-toolkit'

/**
 * Check whether a file exists at the given path.
 *
 * Wraps `fs.access` into a boolean check. Returns `true` when the file is
 * accessible and `false` otherwise -- never throws.
 *
 * @param filePath - The absolute file path to check.
 * @returns True when the file exists and is accessible.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const [error] = await attemptAsync(() => access(filePath))
  return error === null
}
