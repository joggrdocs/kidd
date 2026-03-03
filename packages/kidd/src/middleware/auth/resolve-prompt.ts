import type { Prompts } from '@/context/types.js'

import type { AuthCredential } from './types.js'

/**
 * Resolve a bearer credential by interactively prompting the user.
 *
 * Uses `prompts.password()` to ask for an API key or token. Returns
 * null if the user cancels the prompt or provides an empty value.
 *
 * Should be placed last in the resolver chain as a fallback.
 *
 * @param options - Options with the prompt message and prompts instance.
 * @returns A bearer credential on input, null on cancellation.
 */
export async function resolveFromPrompt(options: {
  readonly message: string
  readonly prompts: Prompts
}): Promise<AuthCredential | null> {
  try {
    const token = await options.prompts.password({ message: options.message })

    if (!token) {
      return null
    }

    return { token, type: 'bearer' }
  } catch {
    return null
  }
}
