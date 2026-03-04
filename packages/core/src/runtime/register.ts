import { hasTag } from '@kidd-cli/utils/tag'
import type { Argv } from 'yargs'

import type { Context } from '@/context/types.js'
import type { Command, CommandMap, Middleware } from '@/types.js'

import { registerCommandArgs } from './args/index.js'
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
 * and recursively registers each command (including subcommands) on
 * the provided yargs Argv instance.
 *
 * @param options - Registration options including the command map, yargs instance, and resolution ref.
 */
export function registerCommands(options: RegisterCommandsOptions): void {
  const { instance, commands, resolved, parentPath } = options
  const commandEntries = Object.entries(commands).filter(([, entry]) => isCommand(entry))

  for (const [name, entry] of commandEntries) {
    registerResolvedCommand({
      builder: instance,
      cmd: entry as Command,
      instance,
      name,
      parentPath,
      resolved,
    })
  }
}

export type { ResolvedCommand, ResolvedRef } from './types.js'

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface RegisterResolvedCommandOptions {
  builder: Argv
  cmd: Command
  instance: Argv
  name: string
  parentPath: string[]
  resolved: ResolvedRef
}

interface RegisterCommandsOptions {
  commands: CommandMap
  instance: Argv
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
  const { instance, name, cmd, resolved, parentPath } = options
  const description = cmd.description ?? ''

  instance.command(
    name,
    description,
    (builder: Argv) => {
      registerCommandArgs(builder, cmd.args)

      if (cmd.commands) {
        const subCommands = Object.entries(cmd.commands).filter(([, entry]) => isCommand(entry))

        for (const [subName, subEntry] of subCommands) {
          registerResolvedCommand({
            builder,
            cmd: subEntry as Command,
            instance: builder,
            name: subName,
            parentPath: [...parentPath, name],
            resolved,
          })
        }

        if (cmd.handler) {
          builder.demandCommand(0)
        } else {
          builder.demandCommand(1, 'You must specify a subcommand.')
        }
      }

      return builder
    },
    () => {
      resolved.ref = {
        args: cmd.args,
        commandPath: [...parentPath, name],
        handler: cmd.handler as ((ctx: Context) => Promise<void> | void) | undefined,
        middleware: (cmd.middleware ?? []) as Middleware[],
      }
    }
  )
}
