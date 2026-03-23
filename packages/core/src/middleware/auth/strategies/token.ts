import { attemptAsync } from '@kidd-cli/utils/fp'

import type { Log } from '@/middleware/logger/types.js'

import { createBearerCredential, isValidToken } from '../credential.js'
import type { AuthCredential } from '../types.js'

/**
 * Resolve a bearer credential by interactively prompting the user.
 *
 * Uses `log.password()` to ask for an API key or token. Returns
 * null if the user cancels the prompt or provides an empty value.
 *
 * Should be placed last in the resolver chain as a fallback.
 *
 * @param options - Options with the prompt message and log instance.
 * @returns A bearer credential on input, null on cancellation.
 */
export async function resolveFromToken(options: {
  readonly message: string
  readonly log: Log
}): Promise<AuthCredential | null> {
  const [promptError, token] = await attemptAsync(() =>
    options.log.password({ message: options.message })
  )

  if (promptError) {
    return null
  }

  if (!isValidToken(token)) {
    return null
  }

  return createBearerCredential(token)
}
