import { withTag } from '@kidd/utils/tag'

import type { ArgsDef, CommandDef, Command as CommandType } from './types.js'

/**
 * Define a CLI command with typed args, config, and handler.
 *
 * @param def - Command definition including description, args schema, and handler.
 * @returns A resolved Command object for registration in the command map.
 */
export function command<
  TArgsDef extends ArgsDef = ArgsDef,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
>(def: CommandDef<TArgsDef, TConfig>): CommandType<TArgsDef, TConfig> {
  return withTag({ ...def }, 'Command')
}
