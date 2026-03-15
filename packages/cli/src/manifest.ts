import { join } from 'node:path'

import { readManifest } from '@kidd-cli/utils/manifest'

/**
 * Validated CLI manifest with all required fields guaranteed present.
 */
export interface CLIManifest {
  readonly name: string
  readonly version: string
  readonly description: string
}

/**
 * Read and validate the CLI package manifest.
 *
 * Reads package.json one directory above `baseDir` (the dist output sits
 * one level below the package root) and ensures all required fields are
 * present. Returns an error Result if the manifest cannot be read or any
 * required field is missing.
 *
 * @param baseDir - The directory the CLI entry file lives in (typically `import.meta.dirname`).
 * @returns A Result tuple: error on failure, validated {@link CLIManifest} on success.
 */
export async function loadCLIManifest(
  baseDir: string
): Promise<readonly [Error, null] | readonly [null, CLIManifest]> {
  const [manifestError, manifest] = await readManifest(join(baseDir, '..'))

  if (manifestError) {
    return [new Error(`Failed to read CLI manifest: ${manifestError.message}`), null] as const
  }

  if (!manifest.name) {
    return [new Error('CLI manifest is missing required field: name'), null] as const
  }

  if (!manifest.version) {
    return [new Error('CLI manifest is missing required field: version'), null] as const
  }

  if (!manifest.description) {
    return [new Error('CLI manifest is missing required field: description'), null] as const
  }

  return [null, { description: manifest.description, name: manifest.name, version: manifest.version }] as const
}
