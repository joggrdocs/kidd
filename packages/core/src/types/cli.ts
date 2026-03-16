import type { z } from 'zod'

import type { CommandMap, CommandsConfig } from './command.js'
import type { Middleware } from './middleware.js'

// ---------------------------------------------------------------------------
// CLI types
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
