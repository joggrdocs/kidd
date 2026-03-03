import { createStore } from '@/lib/store/create-store.js'

import { authCredentialSchema } from './schema.js'
import type { AuthCredential } from './types.js'

/**
 * Resolve credentials from a JSON file on disk.
 *
 * Uses the file-backed store with local-then-global resolution to find
 * the credentials file, then validates its contents against the auth
 * credential schema.
 *
 * @param options - Options with the filename and directory name.
 * @returns A validated auth credential, or null if not found or invalid.
 */
export function resolveFromFile(options: {
  readonly filename: string
  readonly dirName: string
}): AuthCredential | null {
  const store = createStore({ dirName: options.dirName })
  const data = store.load(options.filename)

  if (data === null) {
    return null
  }

  const result = authCredentialSchema.safeParse(data)

  if (!result.success) {
    return null
  }

  return result.data
}
