import { hasTag } from '@kidd-cli/utils/tag'
import type { Argv } from 'yargs'

import type { Context } from '@/context/types.js'
import type { Command, CommandMap, Middleware, PositionalDef } from '@/types.js'

import { registerCommandArgs } from './args/index.js'
import { sortCommandEntries, validateCommandOrder } from './sort-commands.js'
import type { ResolvedCommand, ResolvedRef } from './types.js'

/**
 * Type guard that checks whether a value is a Command object.
 *
 * @param value - The value to test.
 * @returns True when the value has `[TAG] === 'Command'`.
 */
export function isCommand(value: unknown): value is Command {
  return hasTag(value, 'Command')
}

/**
 * Register all commands from a CommandMap on a yargs instance.
 *
 * Iterates over the command map, filters for valid Command objects,
 * validates the order array, sorts entries, and recursively registers
 * each command (including subcommands) on the provided yargs Argv instance.
 *
 * @param options - Registration options including the command map, yargs instance, and resolution ref.
 */
export function registerCommands(options: RegisterCommandsOptions): void {
  const { instance, commands, resolved, parentPath, order, errorRef } = options
  const commandEntries = Object.entries(commands).filter((pair): pair is [string, Command] =>
    isCommand(pair[1])
  )

  if (order && order.length > 0) {
    const commandNames = commandEntries.map(([name]) => name)
    const [validationError] = validateCommandOrder({ commandNames, order })
    if (validationError && errorRef) {
      // Intentional mutation: errorRef is a mutable holder for deferred error reporting.
      errorRef.error = validationError
      return
    }
  }

  const sorted = sortCommandEntries({ entries: commandEntries, order })

  sorted.map(([name, entry]) =>
    registerResolvedCommand({
      builder: instance,
      cmd: entry,
      errorRef,
      instance,
      name,
      parentPath,
      resolved,
    })
  )
}

export type { ResolvedCommand, ResolvedRef } from './types.js'

/**
 * Mutable ref holder for deferred error reporting during command registration.
 */
export interface ErrorRef {
  error: Error | undefined
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface RegisterResolvedCommandOptions {
  builder: Argv
  cmd: Command
  errorRef?: ErrorRef
  instance: Argv
  name: string
  parentPath: string[]
  resolved: ResolvedRef
}

interface RegisterCommandsOptions {
  commands: CommandMap
  errorRef?: ErrorRef
  instance: Argv
  order?: readonly string[]
  parentPath: string[]
  resolved: ResolvedRef
}

/**
 * Register a single resolved command (and its subcommands) with yargs.
 *
 * Sets up the yargs command handler, wires argument definitions, and
 * recursively registers any nested subcommands. On match, stores the
 * resolved handler and command path in the shared ref.
 *
 * @private
 * @param options - Command registration context.
 */
function registerResolvedCommand(options: RegisterResolvedCommandOptions): void {
  const { instance, name, cmd, resolved, parentPath, errorRef } = options
  const description = cmd.description ?? ''
  const commandString = buildCommandString(name, cmd.positionals)

  instance.command(
    commandString,
    description,
    (builder: Argv) => {
      registerCommandArgs(builder, cmd.args, cmd.positionals)

      if (cmd.commands) {
        const subCommands = Object.entries(cmd.commands).filter((pair): pair is [string, Command] =>
          isCommand(pair[1])
        )

        if (cmd.order && cmd.order.length > 0) {
          const subNames = subCommands.map(([n]) => n)
          const [validationError] = validateCommandOrder({
            commandNames: subNames,
            order: cmd.order,
          })
          if (validationError && errorRef) {
            // Intentional mutation: errorRef is a mutable holder for deferred error reporting.
            errorRef.error = validationError
            return builder
          }
        }

        const sortedSubs = sortCommandEntries({ entries: subCommands, order: cmd.order })

        sortedSubs.map(([subName, subEntry]) =>
          registerResolvedCommand({
            builder,
            cmd: subEntry,
            errorRef,
            instance: builder,
            name: subName,
            parentPath: [...parentPath, name],
            resolved,
          })
        )

        if (cmd.handler) {
          builder.demandCommand(0)
        } else {
          builder.demandCommand(1, 'You must specify a subcommand.')
        }
      }

      return builder
    },
    () => {
      // Intentional mutation: yargs callback model requires mutable ref capture.
      // The `as` casts are accepted exceptions — generic handler/middleware types
      // Cannot be narrowed further inside the yargs callback boundary.
      resolved.ref = {
        args: cmd.args,
        commandPath: [...parentPath, name],
        handler: cmd.handler as ((ctx: Context) => Promise<void> | void) | undefined,
        middleware: (cmd.middleware ?? []) as Middleware[],
      }
    }
  )
}

/**
 * Build a yargs command string with positional placeholders.
 *
 * Required positionals use `<name>` and optional positionals use `[name]`.
 * When no positionals are defined, returns the bare command name.
 *
 * @private
 * @param name - The base command name.
 * @param positionals - Optional positional definitions.
 * @returns The command string with positional placeholders appended.
 */
function buildCommandString(
  name: string,
  positionals: readonly PositionalDef[] | undefined
): string {
  if (!positionals || positionals.length === 0) {
    return name
  }
  const placeholders = positionals.map((p) => formatPositionalPlaceholder(p))
  return [name, ...placeholders].join(' ')
}

/**
 * Format a single positional definition as a yargs placeholder string.
 *
 * @private
 * @param def - The positional definition.
 * @returns `<name>` for required positionals, `[name]` for optional ones.
 */
function formatPositionalPlaceholder(def: PositionalDef): string {
  if (def.required === false) {
    return `[${def.name}]`
  }
  return `<${def.name}>`
}
