import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { attemptAsync } from 'es-toolkit'
import { z } from 'zod'

import type { ResultAsync } from './fp/result.js'
import { err, ok } from './fp/result.js'
import { jsonParse } from './json.js'

const ManifestSchema = z.object({
  author: z
    .union([
      z.string(),
      z.object({
        email: z.string().optional(),
        name: z.string(),
        url: z.string().optional(),
      }),
    ])
    .optional(),
  bin: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  description: z.string().optional(),
  homepage: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  license: z.string().optional(),
  name: z.string().optional(),
  repository: z
    .union([
      z.string(),
      z.object({
        directory: z.string().optional(),
        type: z.string().optional(),
        url: z.string(),
      }),
    ])
    .optional(),
  version: z.string().trim().min(1).optional(),
})

/**
 * A parsed package.json manifest with common fields extracted.
 */
export interface Manifest {
  readonly name: string | undefined
  readonly version: string | undefined
  readonly description: string | undefined
  readonly license: string | undefined
  readonly author: string | undefined
  readonly repository: string | undefined
  readonly homepage: string | undefined
  readonly keywords: readonly string[]
  readonly bin: Readonly<Record<string, string>> | undefined
}

/**
 * Result type for manifest operations. Error is a plain message string.
 */
export type ManifestResult = ResultAsync<Manifest>

/**
 * Read a package.json file and extract common manifest fields.
 *
 * @param dir - Directory containing the package.json. Defaults to the current working directory.
 * @returns A Result tuple with the parsed {@link Manifest} or an error message.
 */
export async function readManifest(dir?: string): ManifestResult {
  const filePath = resolve(dir || '.', 'package.json')
  const [readError, raw] = await readManifestFile(filePath)
  if (readError) {
    return err(readError)
  }
  const [parseError, data] = jsonParse(raw)
  if (parseError) {
    return err(parseError)
  }

  const result = ManifestSchema.safeParse(data)
  if (!result.success) {
    return err(`Invalid package.json: ${result.error.issues.map((i) => i.message).join(', ')}`)
  }

  return ok(toManifest(result.data))
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Read the raw contents of a package.json file.
 *
 * @private
 * @param filePath - Absolute path to the package.json.
 * @returns A Result tuple with the file contents or an error message.
 */
async function readManifestFile(filePath: string): ResultAsync<string> {
  const [error, content] = await attemptAsync<string, Error>(() => readFile(filePath, 'utf8'))
  if (error) {
    return err(`Failed to read ${filePath}: ${error.message}`)
  }
  return ok(content)
}

/**
 * Convert validated schema output to a Manifest.
 *
 * @private
 * @param data - The Zod-validated package.json data.
 * @returns A normalized Manifest object.
 */
function toManifest(data: z.infer<typeof ManifestSchema>): Manifest {
  return {
    author: normalizeAuthor(data.author),
    bin: normalizeBin(data.bin),
    description: data.description,
    homepage: data.homepage,
    keywords: data.keywords ?? [],
    license: data.license,
    name: data.name,
    repository: normalizeRepository(data.repository),
    version: data.version,
  }
}

/**
 * Normalize the author field to a plain string.
 *
 * @private
 * @param author - The raw author value from package.json.
 * @returns The author as a string, or undefined.
 */
function normalizeAuthor(
  author: string | { name: string; email?: string; url?: string } | undefined
): string | undefined {
  if (author === undefined) {
    return undefined
  }
  if (typeof author === 'string') {
    return author
  }
  return author.name
}

/**
 * Normalize the repository field to a plain URL string.
 *
 * @private
 * @param repository - The raw repository value from package.json.
 * @returns The repository URL as a string, or undefined.
 */
function normalizeRepository(
  repository: string | { type?: string; url: string; directory?: string } | undefined
): string | undefined {
  if (repository === undefined) {
    return undefined
  }
  if (typeof repository === 'string') {
    return repository
  }
  return repository.url
}

/**
 * Normalize the bin field to a record.
 *
 * @private
 * @param bin - The raw bin value from package.json.
 * @returns A record mapping binary names to paths, or undefined.
 */
function normalizeBin(
  bin: string | Record<string, string> | undefined
): Record<string, string> | undefined {
  if (bin === undefined) {
    return undefined
  }
  if (typeof bin === 'string') {
    return { '': bin }
  }
  return bin
}
