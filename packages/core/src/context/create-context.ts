import * as clack from '@clack/prompts'

import { createCliLogger } from '@/lib/logger.js'
import type { CliLogger } from '@/lib/logger.js'
import type { AnyRecord, KiddStore, Merge } from '@/types.js'

import { createContextError } from './error.js'
import { createContextOutput } from './output.js'
import { createContextPrompts } from './prompts.js'
import { createMemoryStore } from './store.js'
import type { Context, Meta, Output, Prompts, Spinner, Store, StoreMap } from './types.js'

/**
 * Options for creating a {@link Context} instance via {@link createContext}.
 *
 * Carries the parsed args, validated config, and CLI metadata needed to
 * assemble a fully-wired context. An optional `logger` override allows
 * callers to inject a custom {@link CliLogger}; when omitted a default
 * @clack/prompts-backed instance is used.
 */
export interface CreateContextOptions<TArgs extends AnyRecord, TConfig extends AnyRecord> {
  readonly args: TArgs
  readonly config: TConfig
  readonly meta: { readonly name: string; readonly version: string; readonly command: string[] }
  readonly logger?: CliLogger
  readonly output?: NodeJS.WriteStream
}

/**
 * Create the {@link Context} object threaded through middleware and command handlers.
 *
 * Assembles logger, spinner, output, store, prompts, and meta from
 * the provided options into a single immutable context. Each sub-system is
 * constructed via its own factory so this function remains a lean orchestrator.
 *
 * @param options - Args, config, and meta for the current invocation.
 * @returns A fully constructed Context.
 */
export function createContext<TArgs extends AnyRecord, TConfig extends AnyRecord>(
  options: CreateContextOptions<TArgs, TConfig>
): Context<TArgs, TConfig> {
  const ctxLogger: CliLogger = options.logger ?? createCliLogger()
  const ctxSpinner: Spinner = clack.spinner()
  const ctxOutput: Output = createContextOutput(options.output ?? process.stdout)
  const ctxStore: Store<Merge<KiddStore, StoreMap>> = createMemoryStore()
  const ctxPrompts: Prompts = createContextPrompts()
  const ctxMeta: Meta = {
    command: options.meta.command,
    name: options.meta.name,
    version: options.meta.version,
  }

  // Middleware-augmented properties (e.g. `auth`) are added at runtime.
  // See `decorateContext` — they are intentionally absent here.
  return {
    args: options.args as Context<TArgs, TConfig>['args'],
    config: options.config as Context<TArgs, TConfig>['config'],
    fail(message: string, failOptions?: { code?: string; exitCode?: number }): never {
      throw createContextError(message, failOptions)
    },
    logger: ctxLogger,
    meta: ctxMeta as Context<TArgs, TConfig>['meta'],
    output: ctxOutput,
    prompts: ctxPrompts,
    spinner: ctxSpinner,
    store: ctxStore,
  } as Context<TArgs, TConfig>
}
