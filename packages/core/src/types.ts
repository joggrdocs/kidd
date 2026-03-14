import type { Tagged } from '@kidd-cli/utils/tag'
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
 *
 * Extend via module augmentation with {@link ConfigType} to derive the
 * shape from your Zod schema:
 *
 * ```ts
 * declare module '@kidd-cli/core' {
 *   interface CliConfig extends ConfigType<typeof configSchema> {}
 * }
 * ```
 */
export interface CliConfig {}

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
 * Derive the config type from a Zod schema for use in module augmentation.
 *
 * Use this in a `declare module` block to keep `CliConfig` in sync with
 * your Zod config schema, eliminating manual type duplication:
 *
 * ```ts
 * import type { ConfigType } from '@kidd-cli/core'
 *
 * declare module '@kidd-cli/core' {
 *   interface CliConfig extends ConfigType<typeof configSchema> {}
 * }
 * ```
 */
export type ConfigType<TSchema extends z.ZodType> = z.infer<TSchema>

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

/**
 * Detects the `any` type using the intersection trick.
 * `0 extends 1 & T` is only true when T is `any`.
 */
export type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Converts a union `A | B | C` to an intersection `A & B & C`
 * via the standard contravariant trick.
 */
export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never

/**
 * Environment descriptor for typed middleware.
 * Middleware declares the context variables it provides via the `Variables` property.
 *
 * @example
 * ```ts
 * middleware<{ Variables: { user: User } }>(async (ctx, next) => {
 *   decorateContext(ctx, 'user', await fetchUser())
 *   await next()
 * })
 * ```
 */
export interface MiddlewareEnv {
  readonly Variables?: AnyRecord
}

/**
 * Extracts the `Variables` from a {@link MiddlewareEnv}, guarding against `any`.
 * Returns an empty object when `TEnv` is `any` or has no `Variables`.
 */
export type ExtractVariables<TEnv extends MiddlewareEnv> =
  IsAny<TEnv> extends true
    ? {} // eslint-disable-line @typescript-eslint/ban-types -- empty intersection identity
    : TEnv extends { readonly Variables: infer TVars extends AnyRecord }
      ? TVars
      : {} // eslint-disable-line @typescript-eslint/ban-types -- empty intersection identity

/**
 * Extracts the `TEnv` type parameter from a {@link Middleware} instance.
 */
export type MiddlewareEnvOf<T> = T extends Middleware<infer TEnv> ? TEnv : MiddlewareEnv

/**
 * Walks a readonly middleware tuple and intersects all `Variables` from each element.
 * Produces the merged context variables type for a command handler.
 *
 * @example
 * ```ts
 * type Vars = InferVariables<[Middleware<{ Variables: { user: User } }>, Middleware<{ Variables: { org: Org } }>]>
 * // { user: User } & { org: Org }
 * ```
 */
export type InferVariables<TMiddleware extends readonly Middleware<MiddlewareEnv>[]> =
  UnionToIntersection<ExtractVariables<MiddlewareEnvOf<TMiddleware[number]>>>

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * The next() function passed to middleware. Call it to continue to the next middleware or handler.
 */
export type NextFunction = () => Promise<void>

/**
 * A middleware function receives ctx and next.
 *
 * The `_TEnv` generic is phantom — it carries the environment type through
 * {@link Middleware} for type inference without affecting the runtime signature.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type MiddlewareFn<_TEnv extends MiddlewareEnv = MiddlewareEnv> = (
  ctx: Context,
  next: NextFunction
) => Promise<void> | void

/**
 * A middleware object wrapping a MiddlewareFn. Returned by the middleware() factory.
 */
export type Middleware<TEnv extends MiddlewareEnv = MiddlewareEnv> = Tagged<
  {
    readonly handler: MiddlewareFn<TEnv>
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
 *
 * @typeParam TArgs - Parsed args type.
 * @typeParam TConfig - Config type.
 * @typeParam TVars - Context variables contributed by typed middleware.
 */
export type HandlerFn<
  TArgs extends AnyRecord = AnyRecord,
  TConfig extends AnyRecord = AnyRecord,
  TVars = {}, // eslint-disable-line @typescript-eslint/ban-types -- empty intersection identity
> = (ctx: Context<TArgs, TConfig> & Readonly<TVars>) => Promise<void> | void

/**
 * Structured configuration for a command's subcommands.
 *
 * Groups the command source (inline map or directory path) alongside display
 * ordering into a single cohesive object.
 */
export interface CommandsConfig {
  /**
   * Display order for subcommands.
   * Subcommands listed appear first in the specified order; omitted subcommands
   * fall back to alphabetical sort.
   */
  readonly order?: readonly string[]

  /**
   * Directory path to autoload subcommand files from.
   * Mutually exclusive with `commands` within this config object.
   */
  readonly path?: string

  /**
   * Inline subcommand map or a promise from `autoload()`.
   * Mutually exclusive with `path` within this config object.
   */
  readonly commands?: CommandMap | Promise<CommandMap>
}

/**
 * Options passed to `command()`.
 *
 * @typeParam TArgsDef - Arg definitions type.
 * @typeParam TConfig - Config type.
 * @typeParam TMiddleware - Tuple of typed middleware, preserving per-element `TEnv`.
 */
export interface CommandDef<
  TArgsDef extends ArgsDef = ArgsDef,
  TConfig extends AnyRecord = AnyRecord,
  TMiddleware extends readonly Middleware<MiddlewareEnv>[] = readonly Middleware<MiddlewareEnv>[],
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
  middleware?: TMiddleware

  /**
   * Nested subcommands — a static map, a promise from `autoload()`, or a
   * structured {@link CommandsConfig} grouping the source with display order.
   */
  commands?: CommandMap | Promise<CommandMap> | CommandsConfig

  /**
   * The command handler.
   */
  handler?: HandlerFn<
    TArgsDef extends z.ZodObject<z.ZodRawShape> ? z.infer<TArgsDef> : InferArgs<TArgsDef & ArgsDef>,
    TConfig,
    InferVariables<TMiddleware>
  >
}

/**
 * A resolved command object. Returned by command().
 */
export type Command<
  TArgsDef extends ArgsDef = ArgsDef,
  TConfig extends AnyRecord = AnyRecord,
  TMiddleware extends readonly Middleware<MiddlewareEnv>[] = readonly Middleware<MiddlewareEnv>[],
> = Tagged<
  {
    readonly description?: string
    readonly args?: TArgsDef
    readonly middleware?: TMiddleware
    readonly commands?: CommandMap | Promise<CommandMap>
    readonly order?: readonly string[]
    readonly handler?: HandlerFn<
      TArgsDef extends z.ZodObject<z.ZodRawShape>
        ? z.infer<TArgsDef>
        : InferArgs<TArgsDef & ArgsDef>,
      TConfig,
      InferVariables<TMiddleware>
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
 * Help output customization options for the CLI.
 */
export interface CliHelpOptions {
  /**
   * Header text displayed above help output when the CLI is invoked
   * without a command. Not shown on `--help`.
   */
  readonly header?: string
  /**
   * Footer text displayed below help output (e.g., docs URL, bug report link).
   * Shown on all help output.
   */
  readonly footer?: string
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
   *
   * When omitted, falls back to the compile-time `__KIDD_VERSION__` constant
   * injected by the kidd bundler. An error is raised at startup if neither
   * an explicit version nor `__KIDD_VERSION__` is available.
   */
  version?: string
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
   * Accepts a directory path string, a static {@link CommandMap}, a
   * `Promise<CommandMap>`, or a structured {@link CommandsConfig} grouping
   * the source with display ordering.
   */
  commands?: string | CommandMap | Promise<CommandMap> | CommandsConfig
  /**
   * Help output customization (header, footer).
   */
  help?: CliHelpOptions
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
export type CommandFn = <
  TArgsDef extends ArgsDef = ArgsDef,
  TConfig extends AnyRecord = AnyRecord,
  const TMiddleware extends readonly Middleware<MiddlewareEnv>[] =
    readonly Middleware<MiddlewareEnv>[],
>(
  def: CommandDef<TArgsDef, TConfig, TMiddleware>
) => Command

/**
 * Signature of the `middleware()` factory function.
 */
export type MiddlewareFnFactory = <TEnv extends MiddlewareEnv = MiddlewareEnv>(
  handler: MiddlewareFn<TEnv>
) => Middleware<TEnv>
