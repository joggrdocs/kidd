import type { Tagged } from '@kidd/utils/tag'
import type { z } from 'zod'

import type { Context } from './context/types.js'

// ---------------------------------------------------------------------------
// Register (module augmentation)
// ---------------------------------------------------------------------------

/**
 * Global args merged into every ctx.args.
 */
export interface KiddArgs {}

/**
 * Global config merged into every ctx.config.
 */
export interface KiddConfig {}

/**
 * Global store keys merged into every ctx.store.
 */
export interface KiddStore {}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Extract the inferred output type from a zod schema, or fall back to a plain object.
 */
export type InferSchema<TSchema> = TSchema extends z.ZodType<infer TOutput> ? TOutput : AnyRecord

/**
 * Merge two types, with TBase overriding TOverride.
 */
export type Merge<TBase, TOverride> = Omit<TBase, keyof TOverride> & TOverride

/**
 * String keys of a record.
 */
export type StringKeyOf<TRecord> = Extract<keyof TRecord, string>

/**
 * A record with string keys and unknown values. Used as the default constraint
 * for args, config, and general-purpose record types throughout the framework.
 */
export type AnyRecord = Record<string, unknown>

/**
 * Recursively makes all properties readonly.
 * Primitives and functions pass through unchanged.
 * Arrays become readonly tuples, objects get readonly properties at every depth.
 */
export type DeepReadonly<TType> = TType extends (...args: unknown[]) => unknown
  ? TType
  : TType extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : TType extends object
      ? { readonly [Key in keyof TType]: DeepReadonly<TType[Key]> }
      : TType

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * The next() function passed to middleware. Call it to continue to the next middleware or handler.
 */
export type NextFunction = () => Promise<void>

/**
 * A middleware function receives ctx and next.
 */
export type MiddlewareFn<TConfig extends AnyRecord = AnyRecord> = (
  ctx: Context<AnyRecord, TConfig>,
  next: NextFunction
) => Promise<void> | void

/**
 * A middleware object wrapping a MiddlewareFn. Returned by the middleware() factory.
 */
export type Middleware<TConfig extends AnyRecord = AnyRecord> = Tagged<
  {
    readonly handler: MiddlewareFn<TConfig>
  },
  'Middleware'
>

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/**
 * Yargs-native arg format -- accepted as an alternative to zod.
 * Converted to a zod schema internally before parsing.
 */
export interface YargsArgDef {
  type: 'string' | 'number' | 'boolean' | 'array'
  description?: string
  required?: boolean
  default?: unknown
  alias?: string | string[]
  choices?: readonly string[]
}

/**
 * Arg definitions accepted by `command()`.
 *
 * Either a zod object schema (recommended) or a record of yargs-native arg
 * definitions. Both produce the same typed `ctx.args` -- yargs format is
 * converted to zod internally before parsing.
 */
export type ArgsDef = z.ZodObject<z.ZodRawShape> | Record<string, YargsArgDef>

/**
 * Map a single yargs arg def to its TypeScript type.
 */
type YargsArgValue<TDef extends YargsArgDef> = TDef['required'] extends true
  ? YargsArgBaseType<TDef['type']>
  : TDef['default'] extends undefined
    ? YargsArgBaseType<TDef['type']> | undefined
    : YargsArgBaseType<TDef['type']>

type YargsArgBaseType<TType extends string> = TType extends 'string'
  ? string
  : TType extends 'number'
    ? number
    : TType extends 'boolean'
      ? boolean
      : TType extends 'array'
        ? string[]
        : unknown

/**
 * Resolve the parsed args type from either format.
 */
export type InferArgs<TDef extends ArgsDef> =
  TDef extends z.ZodObject<z.ZodRawShape>
    ? z.infer<TDef>
    : TDef extends Record<string, YargsArgDef>
      ? { [Key in keyof TDef]: YargsArgValue<TDef[Key]> }
      : AnyRecord

/**
 * Handler function for a command. Receives the fully typed context.
 */
export type HandlerFn<
  TArgs extends AnyRecord = AnyRecord,
  TConfig extends AnyRecord = AnyRecord,
> = (ctx: Context<TArgs, TConfig>) => Promise<void> | void

/**
 * Options passed to `command()`.
 */
export interface CommandDef<
  TArgsDef extends ArgsDef = ArgsDef,
  TConfig extends AnyRecord = AnyRecord,
> {
  /**
   * Human-readable description shown in help text.
   */
  description?: string

  /**
   * Arg definitions -- zod object schema (recommended) or yargs-native format.
   */
  args?: TArgsDef

  /**
   * Command-level middleware. Runs inside the root middleware chain, wrapping the handler.
   */
  middleware?: Middleware[]

  /**
   * Nested subcommands — a static map or a promise from `autoload()`.
   */
  commands?: CommandMap | Promise<CommandMap>

  /**
   * The command handler.
   */
  handler?: HandlerFn<
    TArgsDef extends z.ZodObject<z.ZodRawShape> ? z.infer<TArgsDef> : InferArgs<TArgsDef & ArgsDef>,
    TConfig
  >
}

/**
 * A resolved command object. Returned by command().
 */
export type Command<
  TArgsDef extends ArgsDef = ArgsDef,
  TConfig extends AnyRecord = AnyRecord,
> = Tagged<
  {
    readonly description?: string
    readonly args?: TArgsDef
    readonly middleware?: Middleware[]
    readonly commands?: CommandMap | Promise<CommandMap>
    readonly handler?: HandlerFn<
      TArgsDef extends z.ZodObject<z.ZodRawShape>
        ? z.infer<TArgsDef>
        : InferArgs<TArgsDef & ArgsDef>,
      TConfig
    >
  },
  'Command'
>

/**
 * A map of command name to resolved {@link Command}. Used for subcommands and the manifest.
 */
export interface CommandMap {
  [name: string]: Command
}

/**
 * Options accepted by `autoload()`.
 */
export interface AutoloadOptions {
  /**
   * Directory to scan for command files. Defaults to the directory of the calling file.
   */
  dir?: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Config loading options nested inside {@link CliOptions}.
 */
export interface CliConfigOptions<TSchema extends z.ZodType = z.ZodType> {
  /**
   * Zod schema to validate the loaded config. Infers `ctx.config` type.
   */
  schema?: TSchema
  /**
   * Override the config file name. Default: derived from `name` in CliOptions.
   */
  name?: string
}

/**
 * Options passed to `cli()`.
 */
export interface CliOptions<TSchema extends z.ZodType = z.ZodType> {
  /**
   * CLI name. Used for help text and config file discovery.
   */
  name: string
  /**
   * CLI version. Enables `--version` flag.
   */
  version: string
  /**
   * Human-readable description shown in help text.
   */
  description?: string
  /**
   * Runtime config options (schema, config file name override).
   */
  config?: CliConfigOptions<TSchema>
  /**
   * Middleware stack. Executed in order before each command handler.
   */
  middleware?: Middleware[]
  /**
   * Override the commands source. When omitted, `cli()` loads `kidd.config.ts`
   * and autoloads from its `commands` field (falling back to `'./commands'`).
   *
   * Accepts a directory path string, a static {@link CommandMap}, or a
   * `Promise<CommandMap>` for advanced use and testing.
   */
  commands?: string | CommandMap | Promise<CommandMap>
}

/**
 * Signature of the `cli()` entry point function.
 */
export type CliFn = <TSchema extends z.ZodType = z.ZodType>(
  options: CliOptions<TSchema>
) => Promise<void>

/**
 * Signature of the `command()` factory function.
 */
export type CommandFn = <TArgsDef extends ArgsDef = ArgsDef, TConfig extends AnyRecord = AnyRecord>(
  def: CommandDef<TArgsDef, TConfig>
) => Command<TArgsDef, TConfig>

/**
 * Signature of the `middleware()` factory function.
 */
export type MiddlewareFnFactory = <TConfig extends AnyRecord = AnyRecord>(
  handler: MiddlewareFn<TConfig>
) => Middleware<TConfig>
