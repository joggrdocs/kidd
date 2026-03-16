import type { Argv, Options as YargsOptions, PositionalOptions } from 'yargs'

import type { Command, PositionalDef, YargsArgDef } from '@/types.js'

import { isZodSchema, zodSchemaToYargsOptions } from './zod.js'

/**
 * Register argument definitions on a yargs builder.
 *
 * Accepts either a zod object schema or a record of yargs-native arg definitions
 * and wires them as yargs options on the given builder instance. When positional
 * definitions are provided, they are registered via `builder.positional()`.
 *
 * @param builder - The yargs Argv instance to register options on.
 * @param args - Argument definitions from a Command.
 * @param positionals - Optional positional argument definitions.
 */
export function registerCommandArgs(
  builder: Argv,
  args: Command['args'],
  positionals?: readonly PositionalDef[]
): void {
  if (positionals && positionals.length > 0) {
    positionals.map((p) => builder.positional(p.name, positionalDefToOptions(p)))
  }

  if (!args) {
    return
  }
  if (isZodSchema(args)) {
    const options = zodSchemaToYargsOptions(args)
    Object.entries(options).map(([key, opt]) => builder.option(key, opt))
  } else {
    Object.entries(args).map(([key, def]) => registerSingleArg(builder, key, def))
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Register a single yargs arg definition as either a positional or an option.
 *
 * @private
 * @param builder - The yargs Argv instance.
 * @param key - The argument name.
 * @param def - The yargs arg definition.
 */
function registerSingleArg(builder: Argv, key: string, def: YargsArgDef): void {
  if (def.positional) {
    builder.positional(key, yargsArgDefToPositional(def))
    return
  }
  builder.option(key, yargsArgDefToOption(def))
}

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

/**
 * Convert a {@link YargsArgDef} with `positional: true` into yargs positional options.
 *
 * @private
 * @param def - The yargs arg definition marked as positional.
 * @returns A yargs positional option object.
 */
function yargsArgDefToPositional(def: YargsArgDef): PositionalOptions {
  return {
    choices: def.choices as string[],
    default: def.default,
    demandOption: def.required ?? false,
    describe: def.description,
    type: resolvePositionalType(def.type),
  }
}

/**
 * Convert a {@link PositionalDef} into yargs positional options.
 *
 * @private
 * @param def - The positional definition.
 * @returns A yargs positional option object.
 */
function positionalDefToOptions(def: PositionalDef): PositionalOptions {
  return {
    choices: def.choices as string[],
    default: def.default,
    demandOption: def.required ?? false,
    describe: def.description,
    type: def.type ?? 'string',
  }
}

/**
 * Map a yargs arg type to a valid positional type.
 *
 * Positionals only support `'string'` and `'number'`. The `'array'` and
 * `'boolean'` types fall back to `'string'`.
 *
 * @private
 * @param type - The yargs arg type.
 * @returns A positional-compatible type.
 */
function resolvePositionalType(type: YargsArgDef['type']): 'string' | 'number' {
  if (type === 'number') {
    return 'number'
  }
  return 'string'
}
