import { attemptAsync } from 'es-toolkit'

import type { AnyRecord, Command } from '@/types.js'

import { createTestContext } from './context.js'
import { normalizeError } from './normalize-error.js'
import type { HandlerResult, TestContextOptions } from './types.js'

/**
 * Execute a single command handler in isolation with a test context.
 *
 * Creates a test context with the given overrides, calls the command's handler,
 * and captures any ContextError thrown by `ctx.fail()`.
 *
 * @param cmd - The command whose handler to invoke.
 * @param overrides - Optional test context overrides.
 * @returns A HandlerResult with the context, captured stdout, and any error.
 */
export async function runHandler<
  TArgs extends AnyRecord = AnyRecord,
  TConfig extends AnyRecord = AnyRecord,
>(
  cmd: Command,
  overrides?: TestContextOptions<TArgs, TConfig>
): Promise<HandlerResult<TArgs, TConfig>> {
  const { ctx, stdout } = createTestContext<TArgs, TConfig>(overrides)

  if (!cmd.handler) {
    return { ctx, error: undefined, stdout }
  }

  const [error] = await attemptAsync(async () => cmd.handler!(ctx))

  return { ctx, error: error ? normalizeError(error) : undefined, stdout }
}
