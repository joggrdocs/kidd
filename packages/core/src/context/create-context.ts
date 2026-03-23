import pc from 'picocolors'
import type { Colors } from 'picocolors/types'

import type { AnyRecord, KiddStore, Merge, ResolvedDirs } from '@/types/index.js'

import { createContextError } from './error.js'
import { createContextFormat } from './format.js'
import { createMemoryStore } from './store.js'
import type { Context, Format, Meta, Store, StoreMap } from './types.js'

/**
 * Options for creating a {@link Context} instance via {@link createContext}.
 *
 * Carries the parsed args, validated config, and CLI metadata needed to
 * assemble a fully-wired base context.
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
}

/**
 * Create the base {@link Context} object threaded through middleware and command handlers.
 *
 * Assembles format, store, and meta from the provided options into a single
 * immutable context. I/O capabilities (logging, prompts, spinners) are added
 * by middleware rather than being baked into the base context.
 *
 * @param options - Args, config, and meta for the current invocation.
 * @returns A fully constructed base Context.
 */
export function createContext<TArgs extends AnyRecord, TConfig extends AnyRecord>(
  options: CreateContextOptions<TArgs, TConfig>
): Context<TArgs, TConfig> {
  const ctxFormat: Format = createContextFormat()
  const ctxStore: Store<Merge<KiddStore, StoreMap>> = createMemoryStore()
  const ctxMeta: Meta = {
    command: options.meta.command,
    dirs: Object.freeze({ ...options.meta.dirs }),
    name: options.meta.name,
    version: options.meta.version,
  }

  // Middleware-augmented properties (e.g. `log`, `auth`) are added at runtime.
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
    meta: ctxMeta as Context<TArgs, TConfig>['meta'],
    store: ctxStore,
  } as Context<TArgs, TConfig>
}
