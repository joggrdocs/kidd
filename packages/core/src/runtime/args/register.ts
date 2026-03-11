import type { Argv, Options as YargsOptions } from 'yargs'

import type { Command, YargsArgDef } from '@/types.js'

import { isZodSchema, zodSchemaToYargsOptions } from './zod.js'

/**
 * Register argument definitions on a yargs builder.
 *
 * Accepts either a zod object schema or a record of yargs-native arg definitions
 * and wires them as yargs options on the given builder instance.
 *
 * @param builder - The yargs Argv instance to register options on.
 * @param args - Argument definitions from a Command.
 */
export function registerCommandArgs(builder: Argv, args: Command['args']): void {
  if (!args) {
    return
  }
  if (isZodSchema(args)) {
    const options = zodSchemaToYargsOptions(args)
    for (const [key, opt] of Object.entries(options)) {
      builder.option(key, opt)
    }
  } else {
    for (const [key, def] of Object.entries(args)) {
      builder.option(key, yargsArgDefToOption(def))
    }
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Convert a yargs-native arg definition into a yargs option object.
 *
 * @private
 * @param def - The yargs arg definition.
 * @returns A yargs option object.
 */
function yargsArgDefToOption(def: YargsArgDef): YargsOptions {
  return {
    alias: def.alias,
    choices: def.choices,
    default: def.default,
    demandOption: def.required ?? false,
    describe: def.description,
    type: def.type,
  }
}
