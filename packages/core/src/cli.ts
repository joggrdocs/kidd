import { resolve } from 'node:path'

import { loadConfig } from '@kidd-cli/config/loader'
import { P, attemptAsync, isPlainObject, isString, match } from '@kidd-cli/utils/fp'
import yargs from 'yargs'
import type { z } from 'zod'

import { DEFAULT_EXIT_CODE, isContextError } from '@/context/index.js'
import { createCliLogger } from '@/lib/logger.js'
import type { CliOptions, CommandMap } from '@/types.js'

import { autoload } from './autoloader.js'
import { createRuntime, registerCommands } from './runtime/index.js'
import type { ResolvedRef } from './runtime/index.js'

const ARGV_SLICE_START = 2

/**
 * Bootstrap and run the CLI application.
 *
 * Parses argv, resolves the matched command, loads config, runs the
 * middleware chain, and invokes the command handler.
 *
 * @param options - CLI configuration including name, version, commands, and middleware.
 */
export async function cli<TSchema extends z.ZodType = z.ZodType>(
  options: CliOptions<TSchema>
): Promise<void> {
  const logger = createCliLogger()

  const [uncaughtError, result] = await attemptAsync(async () => {
    const version = resolveVersion(options.version)

    if (!version) {
      return new Error(
        'No CLI version available. Either pass `version` to cli() or build with the kidd bundler.'
      )
    }

    const program = yargs(process.argv.slice(ARGV_SLICE_START))
      .scriptName(options.name)
      .version(version)
      .strict()
      .help()
      .option('cwd', {
        describe: 'Set the working directory',
        global: true,
        type: 'string',
      })

    if (options.description) {
      program.usage(options.description)
    }

    const resolved: ResolvedRef = { ref: undefined }

    const commands = await resolveCommands(options.commands)

    if (commands) {
      registerCommands({ commands, instance: program, parentPath: [], resolved })
      program.demandCommand(1, 'You must specify a command.')
    }

    const argv: Record<string, unknown> = await program.parseAsync()

    applyCwd(argv)

    if (!resolved.ref) {
      return undefined
    }

    const [runtimeError, runtime] = await createRuntime({
      config: options.config,
      middleware: options.middleware,
      name: options.name,
      version,
    })

    if (runtimeError) {
      return runtimeError
    }

    const [executeError] = await runtime.execute({
      args: resolved.ref.args,
      commandPath: resolved.ref.commandPath,
      handler: resolved.ref.handler,
      middleware: resolved.ref.middleware,
      rawArgs: argv,
    })

    return executeError
  })

  if (uncaughtError) {
    exitOnError(uncaughtError, logger)
    return
  }

  if (result) {
    exitOnError(result, logger)
  }
}

export default cli

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve the CLI version from an explicit value or the compile-time constant.
 *
 * Resolution order:
 * 1. Explicit version string passed to `cli()`
 * 2. `__KIDD_VERSION__` injected by the kidd bundler at build time
 *
 * Returns `undefined` when neither source provides a version.
 *
 * @private
 * @param explicit - The version string from `CliOptions.version`, if provided.
 * @returns The resolved version string, or undefined if unavailable.
 */
function resolveVersion(explicit: string | undefined): string | undefined {
  if (explicit) {
    return explicit
  }

  if (typeof __KIDD_VERSION__ === 'string') {
    return __KIDD_VERSION__
  }

  return undefined
}

/**
 * Resolve the commands option to a CommandMap.
 *
 * Accepts a directory string (triggers autoload), a static CommandMap,
 * a Promise<CommandMap> (from autoload() called at the call site),
 * or undefined (loads `kidd.config.ts` and autoloads from its `commands` field,
 * falling back to `'./commands'`).
 *
 * @private
 * @param commands - The commands option from CliOptions.
 * @returns A CommandMap or undefined.
 */
async function resolveCommands(
  commands: string | CommandMap | Promise<CommandMap> | undefined
): Promise<CommandMap | undefined> {
  if (isString(commands)) {
    return autoload({ dir: commands })
  }
  if (commands instanceof Promise) {
    return commands
  }
  if (isPlainObject(commands)) {
    return commands
  }
  return resolveCommandsFromConfig()
}

/**
 * Load `kidd.config.ts` and autoload commands from its `commands` field.
 *
 * Falls back to `'./commands'` when the config file is missing, fails to load,
 * or does not specify a `commands` field.
 *
 * @private
 * @returns A CommandMap autoloaded from the configured commands directory.
 */
async function resolveCommandsFromConfig(): Promise<CommandMap> {
  const DEFAULT_COMMANDS_DIR = './commands'

  const [configError, configResult] = await loadConfig()
  if (configError || !configResult) {
    return autoload({ dir: DEFAULT_COMMANDS_DIR })
  }

  const dir = configResult.config.commands ?? DEFAULT_COMMANDS_DIR
  return autoload({ dir })
}

/**
 * Change the process working directory when `--cwd` is provided.
 *
 * Resolves the value to an absolute path and calls `process.chdir()` so
 * that all downstream `process.cwd()` calls reflect the override.
 *
 * @private
 * @param argv - The parsed argv record from yargs.
 */
function applyCwd(argv: Record<string, unknown>): void {
  if (isString(argv.cwd)) {
    process.chdir(resolve(argv.cwd))
  }
}

/**
 * Handle a CLI error by logging the message and exiting with the appropriate code.
 *
 * ContextErrors carry a custom exit code; all other errors exit with code 1.
 *
 * @private
 * @param error - The caught error value.
 * @param logger - Logger with an error method for output.
 */
function exitOnError(error: unknown, logger: { error(msg: string): void }): void {
  const info = match(error)
    .when(isContextError, (e) => ({ exitCode: e.exitCode, message: e.message }))
    .with(P.instanceOf(Error), (e) => ({ exitCode: DEFAULT_EXIT_CODE, message: e.message }))
    .otherwise((e) => ({ exitCode: DEFAULT_EXIT_CODE, message: String(e) }))

  logger.error(info.message)
  process.exit(info.exitCode)
}
