import type { z } from 'zod'

import type { Log, Prompts, Spinner } from '@/context/types.js'

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
 * Directory name overrides for file-backed stores (auth, config).
 *
 * Both `local` and `global` default to `.<cli-name>` when omitted.
 * Local resolves relative to the project root, global resolves relative
 * to the user's home directory.
 */
export interface DirsConfig {
  /**
   * Directory name for project-local resolution.
   * Resolves as `<project-root>/<local>`. Defaults to `.<cli-name>`.
   */
  readonly local?: string
  /**
   * Directory name for global (home directory) resolution.
   * Resolves as `~/<global>`. Defaults to `.<cli-name>`.
   */
  readonly global?: string
}

/**
 * Resolved directory names where both local and global are guaranteed strings.
 */
export interface ResolvedDirs {
  readonly local: string
  readonly global: string
}

/**
 * Config loading options nested inside {@link CliOptions}.
 */
export interface CliConfigOptions<TSchema extends z.ZodType = z.ZodType> {
  /**
   * Zod schema to validate the loaded config. Infers `ctx.config` type.
   */
  readonly schema?: TSchema
  /**
   * Override the config file name. Default: derived from `name` in CliOptions.
   */
  readonly name?: string
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
  readonly name: string
  /**
   * CLI version. Enables `--version` flag.
   *
   * When omitted, falls back to the compile-time `__KIDD_VERSION__` constant
   * injected by the kidd bundler. An error is raised at startup if neither
   * an explicit version nor `__KIDD_VERSION__` is available.
   */
  readonly version?: string
  /**
   * Human-readable description shown in help text.
   */
  readonly description?: string
  /**
   * Runtime config options (schema, config file name override).
   */
  readonly config?: CliConfigOptions<TSchema>
  /**
   * Middleware stack. Executed in order before each command handler.
   */
  readonly middleware?: Middleware[]
  /**
   * Override the commands source. When omitted, `cli()` loads `kidd.config.ts`
   * and autoloads from its `commands` field (falling back to `'./commands'`).
   *
   * Accepts a directory path string, a static {@link CommandMap}, a
   * `Promise<CommandMap>`, or a structured {@link CommandsConfig} grouping
   * the source with display ordering.
   */
  readonly commands?: string | CommandMap | Promise<CommandMap> | CommandsConfig
  /**
   * Help output customization (header, footer).
   */
  readonly help?: CliHelpOptions
  /**
   * Directory name overrides for file-backed stores (auth, config).
   *
   * Both `local` and `global` default to `.<name>` when omitted.
   */
  readonly dirs?: DirsConfig
  /**
   * Custom log implementation. When omitted, a default `@clack/prompts`-backed
   * logger is created automatically.
   */
  readonly log?: Log
  /**
   * Custom prompts implementation. When omitted, a default `@clack/prompts`-backed
   * prompts instance is created automatically.
   */
  readonly prompts?: Prompts
  /**
   * Custom spinner implementation. When omitted, a default `@clack/prompts`
   * spinner is created automatically.
   */
  readonly spinner?: Spinner
}

/**
 * Signature of the `cli()` entry point function.
 */
export type CliFn = <TSchema extends z.ZodType = z.ZodType>(
  options: CliOptions<TSchema>
) => Promise<void>
