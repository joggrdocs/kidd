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
 * present. Throws immediately if the manifest cannot be read or any
 * required field is missing — this is an unrecoverable entry-point guard.
 *
 * @param baseDir - The directory the CLI entry file lives in (typically `import.meta.dirname`).
 * @returns A validated {@link CLIManifest} with all required fields.
 */
export async function loadCLIManifest(baseDir: string): Promise<CLIManifest> {
  const [manifestError, manifest] = await readManifest(join(baseDir, '..'))

  if (manifestError) {
    throw new Error(`Failed to read CLI manifest: ${manifestError.message}`)
  }

  if (!manifest.name) {
    throw new Error('CLI manifest is missing required field: name')
  }

  if (!manifest.version) {
    throw new Error('CLI manifest is missing required field: version')
  }

  if (!manifest.description) {
    throw new Error('CLI manifest is missing required field: description')
  }

  return {
    description: manifest.description,
    name: manifest.name,
    version: manifest.version,
  }
}
