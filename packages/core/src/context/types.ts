import type { Colors } from 'picocolors/types'

import type { DotDirectory } from '@/lib/dotdir/types.js'
import type {
  AnyRecord,
  DeepReadonly,
  KiddArgs,
  CliConfig,
  KiddStore,
  Merge,
  ResolvedDirs,
  StringKeyOf,
} from '@/types/index.js'
import type { OutputStoreCarrier } from '@/ui/output/store-key.js'

/**
 * Typed in-memory key-value store shape carried on `ctx.store`.
 *
 * Consumers extend this interface via declaration merging to register
 * typed keys without threading generics through every handler:
 *
 * ```ts
 * declare module '@kidd-cli/core' {
 *   interface StoreMap { myKey: MyType }
 * }
 * ```
 */
export interface StoreMap {
  [key: string]: unknown
}

/**
 * Typed key-value store available on every {@link CommandContext}.
 *
 * Provides `get`, `set`, `has`, `delete`, and `clear` over an in-memory
 * `Map`. The generic `TMap` constrains keys and values so consumers
 * receive compile-time safety for registered store keys.
 *
 * @typeParam TMap - Key-value shape (defaults to {@link StoreMap}).
 */
export interface Store<TMap extends AnyRecord = StoreMap> {
  get<TKey extends StringKeyOf<TMap>>(key: TKey): TMap[TKey] | undefined
  set<TKey extends StringKeyOf<TMap>>(key: TKey, value: TMap[TKey]): void
  has(key: string): boolean
  delete(key: string): boolean
  clear(): void
}

/**
 * Options for a yes/no confirmation prompt.
 */
export interface ConfirmOptions {
  readonly message: string
  readonly initialValue?: boolean
}

/**
 * Options for a free-text input prompt.
 */
export interface TextOptions {
  readonly message: string
  readonly placeholder?: string
  readonly defaultValue?: string
  readonly validate?: (value: string | undefined) => string | Error | undefined
}

/**
 * A single option in a select or multi-select prompt.
 *
 * @typeParam TValue - The value type returned when this option is selected.
 */
export interface SelectOption<TValue> {
  readonly value: TValue
  readonly label: string
  readonly hint?: string
}

/**
 * Options for a single-select prompt.
 *
 * @typeParam TValue - The value type of each selectable option.
 */
export interface SelectOptions<TValue> {
  readonly message: string
  readonly options: SelectOption<TValue>[]
  readonly initialValue?: TValue
}

/**
 * Options for a multi-select prompt.
 *
 * @typeParam TValue - The value type of each selectable option.
 */
export interface MultiSelectOptions<TValue> {
  readonly message: string
  readonly options: SelectOption<TValue>[]
  readonly initialValues?: TValue[]
  readonly required?: boolean
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

/**
 * Structured logging API backed by `@clack/prompts` for styled terminal output.
 *
 * Provides info, success, error, warning, step, message, intro/outro,
 * note, and raw output methods. Does not include prompts or spinners —
 * those are separate on `ctx.prompts` and `ctx.spinner`.
 */
export interface Log {
  /**
   * Log an informational message.
   */
  readonly info: (message: string) => void
  /**
   * Log a success message.
   */
  readonly success: (message: string) => void
  /**
   * Log an error message.
   */
  readonly error: (message: string) => void
  /**
   * Log a warning message.
   */
  readonly warn: (message: string) => void
  /**
   * Log a step indicator message.
   */
  readonly step: (message: string) => void
  /**
   * Log a message with an optional custom symbol prefix.
   */
  readonly message: (message: string, opts?: { readonly symbol?: string }) => void
  /**
   * Print an intro banner with an optional title.
   */
  readonly intro: (title?: string) => void
  /**
   * Print an outro banner with an optional closing message.
   */
  readonly outro: (message?: string) => void
  /**
   * Display a boxed note with an optional title.
   */
  readonly note: (message?: string, title?: string) => void
  /**
   * Write a blank line to the output stream.
   */
  readonly newline: () => void
  /**
   * Write raw text followed by a newline to the output stream.
   */
  readonly raw: (text: string) => void
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

/**
 * Interactive prompt methods available on the context.
 *
 * Each method suspends execution until the user provides input.
 * Cancellation (Ctrl-C) throws a ContextError with code `PROMPT_CANCELLED`.
 */
export interface Prompts {
  confirm(opts: ConfirmOptions): Promise<boolean>
  text(opts: TextOptions): Promise<string>
  select<TValue>(opts: SelectOptions<TValue>): Promise<TValue>
  multiselect<TValue>(opts: MultiSelectOptions<TValue>): Promise<TValue[]>
  password(opts: TextOptions): Promise<string>
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

/**
 * Terminal spinner for indicating long-running operations.
 */
export interface Spinner {
  start(message?: string): void
  stop(message?: string): void
  message(message: string): void
}

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

/**
 * Pure string formatters for data serialization (no I/O).
 */
export interface Format {
  /**
   * Serialize a value as pretty-printed JSON.
   */
  json(data: unknown): string
  /**
   * Format an array of objects as an aligned text table.
   */
  table(rows: readonly Record<string, unknown>[]): string
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

/**
 * CLI metadata available on the context. Deeply immutable at the type level.
 */
export interface Meta {
  /**
   * CLI name as defined in `cli({ name })`.
   */
  readonly name: string
  /**
   * CLI version as defined in `cli({ version })`.
   */
  readonly version: string
  /**
   * The resolved command path (e.g. `['deploy', 'preview']`).
   */
  readonly command: readonly string[]
  /**
   * Resolved directory names for file-backed stores.
   *
   * `local` resolves relative to the project root, `global` resolves
   * relative to the user's home directory.
   */
  readonly dirs: ResolvedDirs
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Keys on {@link CommandContext} that are stripped from {@link ScreenContext}.
 *
 * `log` and `spinner` are **not** stripped — they are swapped with
 * React-backed implementations by `screen()` so they render through
 * the `<Output />` component.
 *
 * Only properties that have no screen-safe equivalent are omitted:
 * `colors`, `fail`, `format`, `prompts`.
 */
export type ImperativeContextKeys = 'colors' | 'fail' | 'format' | 'prompts'

/**
 * Context subset available inside `screen()` components via `useScreenContext()`.
 *
 * Retains `log` and `spinner` (swapped with React-backed implementations),
 * data properties (`args`, `config`, `meta`, `store`), and any
 * middleware-decorated properties (`auth`, `http`, `report`, etc.).
 *
 * Omits `colors`, `fail`, `format`, and `prompts` which have no
 * screen-safe equivalent.
 *
 * @typeParam TArgs - Parsed args type.
 * @typeParam TConfig - Config type.
 */
export type ScreenContext<
  TArgs extends AnyRecord = AnyRecord,
  TConfig extends AnyRecord = AnyRecord,
> = Omit<CommandContext<TArgs, TConfig>, ImperativeContextKeys> & OutputStoreCarrier

/**
 * The context object threaded through every handler, middleware, and hook.
 *
 * Contains framework-level primitives: parsed args, validated config, CLI
 * metadata, a key-value store, formatting helpers, logging, prompts, a
 * spinner, and a fail function. Additional capabilities (e.g. `report`,
 * `auth`) are added by middleware via `decorateContext`.
 *
 * All data properties (args, config, meta) are deeply readonly — attempting
 * to mutate any nested property produces a compile-time error. Use `ctx.store`
 * for mutable state that flows between middleware and handlers.
 *
 * @typeParam TArgs - Parsed args type (inferred from the command's zod/yargs args definition).
 * @typeParam TConfig - Config type (inferred from the zod schema passed to `cli({ config: { schema } })`).
 */
export interface CommandContext<
  TArgs extends AnyRecord = AnyRecord,
  TConfig extends AnyRecord = AnyRecord,
> {
  /**
   * Parsed and validated args for this command. Deeply immutable.
   */
  readonly args: DeepReadonly<Merge<KiddArgs, TArgs>>

  /**
   * Color formatting utilities (picocolors). Use for coloring summary
   * values, diagnostic output, and other terminal text.
   */
  readonly colors: Colors

  /**
   * Runtime config validated against the zod schema. Deeply immutable.
   */
  readonly config: DeepReadonly<Merge<CliConfig, TConfig>>

  /**
   * Dot directory manager for reading/writing files in the CLI's
   * dot directories (e.g. `~/.myapp/`, `<project>/.myapp/`).
   */
  readonly dotdir: DotDirectory

  /**
   * Pure string formatters for data serialization (no I/O).
   */
  readonly format: Format

  /**
   * Structured logger for styled terminal output.
   */
  readonly log: Log

  /**
   * Interactive prompts (confirm, text, select, multiselect, password).
   */
  readonly prompts: Prompts

  /**
   * Spinner for long-running operations.
   */
  readonly spinner: Spinner

  /**
   * In-memory key-value store (mutable — use this for middleware-to-handler data flow).
   */
  readonly store: Store<Merge<KiddStore, StoreMap>>

  /**
   * Throw a user-facing error with a clean message (no stack in production).
   */
  readonly fail: (message: string, options?: { code?: string; exitCode?: number }) => never

  /**
   * CLI metadata (name, version, resolved command path). Deeply immutable.
   */
  readonly meta: DeepReadonly<Meta>
}
