import { createPromptUtils } from '@/lib/prompts/index.js'

import { DEFAULT_EXIT_CODE, createContextError } from './error.js'
import type { Prompts } from './types.js'

/**
 * Create the interactive prompt methods for a context.
 *
 * @private
 * @returns A Prompts instance backed by clack.
 */
export function createContextPrompts(): Prompts {
  const utils = createPromptUtils()

  return {
    async confirm(opts): Promise<boolean> {
      const result = await utils.confirm(opts)
      return unwrapCancelSignal(utils, result)
    },
    async multiselect<Type>(opts: Parameters<Prompts['multiselect']>[0]): Promise<Type[]> {
      const result = await utils.multiselect<Type>(
        opts as Parameters<typeof utils.multiselect<Type>>[0]
      )
      return unwrapCancelSignal(utils, result)
    },
    async password(opts): Promise<string> {
      const result = await utils.password(opts)
      return unwrapCancelSignal(utils, result)
    },
    async select<Type>(opts: Parameters<Prompts['select']>[0]): Promise<Type> {
      const result = await utils.select<Type>(opts as Parameters<typeof utils.select<Type>>[0])
      return unwrapCancelSignal(utils, result)
    },
    async text(opts): Promise<string> {
      const result = await utils.text(opts)
      return unwrapCancelSignal(utils, result)
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
 * @param utils - The prompt utils instance (for isCancel and cancel).
 * @param result - The raw prompt result (value or cancel symbol).
 * @returns The unwrapped typed value.
 */
function unwrapCancelSignal<Type>(
  utils: ReturnType<typeof createPromptUtils>,
  result: Type | symbol
): Type {
  if (utils.isCancel(result)) {
    utils.cancel('Operation cancelled.')
    throw createContextError('Prompt cancelled by user', {
      code: 'PROMPT_CANCELLED',
      exitCode: DEFAULT_EXIT_CODE,
    })
  }
  return result as Type
}
