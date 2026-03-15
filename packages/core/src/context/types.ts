import type { Colors } from 'picocolors/types'

import type { CliLogger } from '@/lib/logger.js'
import type {
  AnyRecord,
  DeepReadonly,
  KiddArgs,
  CliConfig,
  KiddStore,
  Merge,
  StringKeyOf,
} from '@/types.js'

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
 * Typed key-value store available on every {@link Context}.
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

export type { CliLogger }

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

/**
 * Terminal spinner for indicating long-running operations.
 */
export interface Spinner {
  start(message?: string): void
  stop(message?: string): void
  message(message: string): void
}

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
  table(rows: Record<string, unknown>[]): string
}

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
  readonly command: string[]
}

/**
 * The context object threaded through every handler, middleware, and hook.
 *
 * All data properties (args, config, meta) are deeply readonly — attempting
 * to mutate any nested property produces a compile-time error. Use `ctx.store`
 * for mutable state that flows between middleware and handlers.
 *
 * Register types (`KiddArgs`, `CliConfig`, etc.) are merged with generics so
 * consumers can use module augmentation for project-wide defaults without
 * threading generics everywhere.
 *
 * @typeParam TArgs - Parsed args type (inferred from the command's zod/yargs args definition).
 * @typeParam TConfig - Config type (inferred from the zod schema passed to `cli({ config: { schema } })`).
 */
export interface Context<
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
   * Pure string formatters for data serialization (no I/O).
   */
  readonly format: Format

  /**
   * Structured logger backed by @clack/prompts for styled terminal output.
   * Also provides check, finding, and tally methods for structured output.
   */
  readonly logger: CliLogger

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
