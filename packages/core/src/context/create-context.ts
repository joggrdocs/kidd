import pc from 'picocolors'
import type { Colors } from 'picocolors/types'

import { createDotDirectory } from '@/lib/dotdir/index.js'
import { createLog } from '@/lib/log.js'
import type { AnyRecord, KiddStore, Merge, ResolvedDirs } from '@/types/index.js'

import { createContextError } from './error.js'
import { createContextFormat } from './format.js'
import { createContextPrompts } from './prompts.js'
import { createContextStatus } from './status.js'
import { createMemoryStore } from './store.js'
import type {
  CommandContext,
  DisplayConfig,
  Format,
  Log,
  Meta,
  Prompts,
  Spinner,
  Status,
  Store,
  StoreMap,
} from './types.js'

/**
 * Options for creating a {@link CommandContext} instance via {@link createContext}.
 *
 * Carries the parsed args, validated config, and CLI metadata needed to
 * assemble a fully-wired context. Optional overrides allow callers to inject
 * custom {@link Log}, {@link Prompts}, {@link Status}, and {@link Spinner}
 * implementations; when omitted, default `@clack/prompts`-backed instances
 * are used.
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
  readonly display?: DisplayConfig
  readonly log?: Log
  readonly prompts?: Prompts
  readonly status?: Status
  /**
   * @deprecated Use `status` instead. When provided, creates a Status
   * wrapper around this spinner for backwards compatibility.
   */
  readonly spinner?: Spinner
}

/**
 * Create the {@link CommandContext} object threaded through middleware and command handlers.
 *
 * Assembles log, status, format, store, prompts, and meta from
 * the provided options into a single immutable context. Each sub-system is
 * constructed via its own factory so this function remains a lean orchestrator.
 *
 * When `display` is provided, per-call defaults are extracted and passed
 * to each factory. Global-only settings (`aliases`, `messages`) are applied
 * via `updateSettings()` at boot time in `cli()`, not here.
 *
 * @param options - Args, config, and meta for the current invocation.
 * @returns A fully constructed CommandContext.
 */
export function createContext<TArgs extends AnyRecord, TConfig extends AnyRecord>(
  options: CreateContextOptions<TArgs, TConfig>
): CommandContext<TArgs, TConfig> {
  const dc = options.display ?? {}
  const commonDefaults = resolveCommonDefaults(dc)

  const ctxLog: Log =
    options.log ??
    createLog({
      boxDefaults: dc.box,
      defaults: commonDefaults,
      output: dc.output,
    })
  const ctxStatus: Status = resolveStatus(options, commonDefaults)
  const ctxFormat: Format = createContextFormat()
  const ctxStore: Store<Merge<KiddStore, StoreMap>> = createMemoryStore()
  const ctxPrompts: Prompts =
    options.prompts ??
    createContextPrompts({
      defaults: commonDefaults,
    })
  const ctxMeta: Meta = {
    command: options.meta.command,
    dirs: Object.freeze({ ...options.meta.dirs }),
    name: options.meta.name,
    version: options.meta.version,
  }

  const ctxDotdir = createDotDirectory({ dirs: options.meta.dirs })

  // Middleware-augmented properties (e.g. `report`, `auth`) are added at runtime.
  // See `decorateContext` — they are intentionally absent here.
  return {
    args: options.args as CommandContext<TArgs, TConfig>['args'],
    colors: Object.freeze({ ...pc }) as Colors,
    config: options.config as CommandContext<TArgs, TConfig>['config'],
    dotdir: ctxDotdir,
    fail(message: string, failOptions?: { code?: string; exitCode?: number }): never {
      // Accepted exception: ctx.fail() is typed `never` and caught by the CLI boundary.
      // This is the framework's halt mechanism — the runner catches the thrown ContextError.
      throw createContextError(message, failOptions)
    },
    format: ctxFormat,
    log: ctxLog,
    meta: ctxMeta as CommandContext<TArgs, TConfig>['meta'],
    prompts: ctxPrompts,
    status: ctxStatus,
    store: ctxStore,
  } as CommandContext<TArgs, TConfig>
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Extract the common per-call defaults from display config.
 *
 * @private
 * @param dc - The display config, if any.
 * @returns Common defaults suitable for prompts, log, and status factories.
 */
function resolveCommonDefaults(dc: DisplayConfig): {
  readonly guide?: boolean
  readonly input?: DisplayConfig['input']
  readonly output?: DisplayConfig['output']
} {
  return {
    guide: dc.guide,
    input: dc.input,
    output: dc.output,
  }
}

/**
 * Resolve the Status instance from options, supporting the deprecated
 * `spinner` override for backwards compatibility.
 *
 * @private
 * @param options - The create context options.
 * @param commonDefaults - Common per-call defaults from display config.
 * @returns A Status instance.
 */
function resolveStatus<TArgs extends AnyRecord, TConfig extends AnyRecord>(
  options: CreateContextOptions<TArgs, TConfig>,
  commonDefaults: { readonly guide?: boolean; readonly output?: DisplayConfig['output'] }
): Status {
  if (options.status !== undefined) {
    return options.status
  }

  const dc = options.display ?? {}

  if (options.spinner !== undefined) {
    return createContextStatus({
      defaults: commonDefaults,
      progressConfig: dc.progress,
      spinner: options.spinner,
      spinnerConfig: dc.spinner,
    })
  }

  return createContextStatus({
    defaults: commonDefaults,
    progressConfig: dc.progress,
    spinnerConfig: dc.spinner,
  })
}
