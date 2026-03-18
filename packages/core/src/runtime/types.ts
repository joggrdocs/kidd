import type { AsyncResult, Result } from '@kidd-cli/utils/fp'
import type { z } from 'zod'

import type { Context } from '@/context/types.js'
import type { ArgsDef, CliConfigOptions, Middleware, ResolvedDirs } from '@/types/index.js'

/**
 * Options for creating a runtime via `createRuntime`.
 */
export interface RuntimeOptions<TSchema extends z.ZodType = z.ZodType> {
  readonly name: string
  readonly version: string
  readonly dirs: ResolvedDirs
  readonly config?: CliConfigOptions<TSchema>
  readonly middleware?: Middleware[]
}

/**
 * A resolved command execution descriptor passed to `Runtime.execute`.
 */
export interface ResolvedExecution {
  readonly handler: ((ctx: Context) => Promise<void> | void) | undefined
  readonly middleware: Middleware[]
  readonly options: ArgsDef | undefined
  readonly positionals: ArgsDef | undefined
  readonly commandPath: readonly string[]
  readonly rawArgs: Record<string, unknown>
}

/**
 * A runtime instance that orchestrates config and middleware execution.
 */
export interface Runtime {
  readonly execute: (command: ResolvedExecution) => AsyncResult<void, Error>
}

/**
 * A runner that executes a middleware chain followed by a final handler.
 */
export interface MiddlewareExecutor {
  readonly execute: (options: {
    readonly ctx: Context
    readonly handler: (ctx: Context) => Promise<void> | void
    readonly middleware: Middleware[]
  }) => Promise<void>
}

/**
 * A parser that cleans and validates raw args against a command's arg definition.
 */
export interface ArgsParser {
  readonly parse: (rawArgs: Record<string, unknown>) => Result<Record<string, unknown>, Error>
}

/**
 * A resolved command reference captured during yargs command registration.
 */
export interface ResolvedCommand {
  readonly handler: ((ctx: Context) => Promise<void> | void) | undefined
  readonly middleware: Middleware[]
  readonly options: ArgsDef | undefined
  readonly positionals: ArgsDef | undefined
  readonly commandPath: string[]
}

/**
 * Mutable ref holder for the resolved command during yargs parsing.
 */
export interface ResolvedRef {
  ref: ResolvedCommand | undefined
}
