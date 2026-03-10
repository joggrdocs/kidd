import * as clack from '@clack/prompts'

import { DEFAULT_EXIT_CODE, createContextError } from './error.js'
import type { Prompts } from './types.js'

/**
 * Create the interactive prompt methods for a context.
 *
 * @returns A Prompts instance backed by clack.
 */
export function createContextPrompts(): Prompts {
  return {
    async confirm(opts): Promise<boolean> {
      const result = await clack.confirm(opts)
      return unwrapCancelSignal(result)
    },
    async multiselect<Type>(opts: Parameters<Prompts['multiselect']>[0]): Promise<Type[]> {
      const result = await clack.multiselect<Type>(
        opts as Parameters<typeof clack.multiselect<Type>>[0]
      )
      return unwrapCancelSignal(result)
    },
    async password(opts): Promise<string> {
      const result = await clack.password(opts)
      return unwrapCancelSignal(result)
    },
    async select<Type>(opts: Parameters<Prompts['select']>[0]): Promise<Type> {
      const result = await clack.select<Type>(opts as Parameters<typeof clack.select<Type>>[0])
      return unwrapCancelSignal(result)
    },
    async text(opts): Promise<string> {
      const result = await clack.text(opts)
      return unwrapCancelSignal(result)
    },
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Unwrap a prompt result that may be a cancel symbol.
 *
 * If the user cancelled (Ctrl-C), throws a ContextError. Otherwise returns
 * the typed result value.
 *
 * @private
 * @param result - The raw prompt result (value or cancel symbol).
 * @returns The unwrapped typed value.
 */
function unwrapCancelSignal<Type>(result: Type | symbol): Type {
  if (clack.isCancel(result)) {
    clack.cancel('Operation cancelled.')
    // Accepted exception: prompt cancellation must propagate as an unwind.
    // The runner catches the thrown ContextError at the CLI boundary.
    throw createContextError('Prompt cancelled by user', {
      code: 'PROMPT_CANCELLED',
      exitCode: DEFAULT_EXIT_CODE,
    })
  }
  return result as Type
}
