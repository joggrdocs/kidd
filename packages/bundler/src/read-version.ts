import { readManifest } from '@kidd-cli/utils/manifest'

import type { AsyncBundlerResult } from './types.js'

/**
 * Read the version string from a project's package.json.
 *
 * Uses `readManifest` to parse the package.json at the given directory and
 * extracts the `version` field. Returns `undefined` when the manifest has no
 * version set.
 *
 * @param cwd - Directory containing the package.json.
 * @returns A result tuple with the version string (or undefined) on success, or an Error on failure.
 */
export async function readVersion(cwd: string): AsyncBundlerResult<string | undefined> {
  const [manifestError, manifest] = await readManifest(cwd)

  if (manifestError) {
    return [new Error(`Failed to read version: ${manifestError.message}`), null]
  }

  return [null, manifest.version]
}
