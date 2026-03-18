import * as clack from '@clack/prompts'
import pc from 'picocolors'
import type { Colors } from 'picocolors/types'

import { createCliLogger } from '@/lib/logger.js'
import type { CliLogger } from '@/lib/logger.js'
import type { AnyRecord, KiddStore, Merge, ResolvedDirs } from '@/types/index.js'

import { createContextError } from './error.js'
import { createContextFormat } from './format.js'
import { createContextPrompts } from './prompts.js'
import { createMemoryStore } from './store.js'
import type { Context, Format, Meta, Prompts, Spinner, Store, StoreMap } from './types.js'

/**
 * Options for creating a {@link Context} instance via {@link createContext}.
 *
 * Carries the parsed args, validated config, and CLI metadata needed to
 * assemble a fully-wired context. Optional overrides allow callers to inject
 * custom {@link CliLogger}, {@link Prompts}, and {@link Spinner} implementations;
 * when omitted, default @clack/prompts-backed instances are used.
 */
export interface CreateContextOptions<TArgs extends AnyRecord, TConfig extends AnyRecord> {
  readonly args: TArgs
  readonly config: TConfig
  readonly meta: {
    readonly name: string
    readonly version: string
    readonly command: string[]
    readonly dirs: ResolvedDirs
  }
  readonly logger?: CliLogger
  readonly prompts?: Prompts
  readonly spinner?: Spinner
}

/**
 * Create the {@link Context} object threaded through middleware and command handlers.
 *
 * Assembles logger, spinner, format, store, prompts, and meta from
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
  const ctxSpinner: Spinner = options.spinner ?? clack.spinner()
  const ctxFormat: Format = createContextFormat()
  const ctxStore: Store<Merge<KiddStore, StoreMap>> = createMemoryStore()
  const ctxPrompts: Prompts = options.prompts ?? createContextPrompts()
  const ctxMeta: Meta = {
    command: options.meta.command,
    dirs: Object.freeze({ ...options.meta.dirs }),
    name: options.meta.name,
    version: options.meta.version,
  }

  // Middleware-augmented properties (e.g. `auth`) are added at runtime.
  // See `decorateContext` — they are intentionally absent here.
  return {
    args: options.args as Context<TArgs, TConfig>['args'],
    colors: Object.freeze({ ...pc }) as Colors,
    config: options.config as Context<TArgs, TConfig>['config'],
    fail(message: string, failOptions?: { code?: string; exitCode?: number }): never {
      // Accepted exception: ctx.fail() is typed `never` and caught by the CLI boundary.
      // This is the framework's halt mechanism — the runner catches the thrown ContextError.
      throw createContextError(message, failOptions)
    },
    format: ctxFormat,
    logger: ctxLogger,
    meta: ctxMeta as Context<TArgs, TConfig>['meta'],
    prompts: ctxPrompts,
    spinner: ctxSpinner,
    store: ctxStore,
  } as Context<TArgs, TConfig>
}
