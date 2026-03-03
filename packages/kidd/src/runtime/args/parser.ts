import { err, ok } from '@kidd/utils/fp'
import type { Result } from '@kidd/utils/fp'
import { formatZodIssues } from '@kidd/utils/validate'

import type { Command } from '@/types.js'

import type { ArgsParser } from '../types.js'
import { isZodSchema } from './zod.js'

/**
 * Create an args parser that cleans and validates raw parsed arguments.
 *
 * Captures the argument definition in a closure and returns an ArgsParser
 * whose `parse` method strips yargs-internal keys and validates against
 * a zod schema when one is defined.
 *
 * @param argsDef - The argument definition from the command.
 * @returns An ArgsParser with a parse method.
 */
export function createArgsParser(argsDef: Command['args']): ArgsParser {
  return {
    parse(rawArgs: Record<string, unknown>): Result<Record<string, unknown>, Error> {
      const cleaned = cleanParsedArgs(rawArgs)
      return validateArgs(argsDef, cleaned)
    },
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Strip yargs-internal keys (`_`, `$0`) and camelCase-duplicated hyphenated keys
 * from a parsed argv record, returning only user-defined arguments.
 *
 * @private
 * @param argv - Raw parsed argv from yargs.
 * @returns A cleaned record containing only user-defined arguments.
 */
function cleanParsedArgs(argv: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(argv).filter(([key]) => key !== '_' && key !== '$0' && !key.includes('-'))
  )
}

/**
 * Validate parsed arguments against a zod schema when one is defined.
 *
 * If the command uses yargs-native args (no zod schema), the parsed args are
 * returned as-is. When a zod schema is present, validation is performed and
 * a Result error is returned on failure.
 *
 * @private
 * @param argsDef - The argument definition from the command.
 * @param parsedArgs - The cleaned parsed arguments.
 * @returns A Result containing validated arguments (zod-parsed when applicable).
 */
function validateArgs(
  argsDef: Command['args'],
  parsedArgs: Record<string, unknown>
): Result<Record<string, unknown>, Error> {
  if (!argsDef || !isZodSchema(argsDef)) {
    return ok(parsedArgs)
  }
  const result = argsDef.safeParse(parsedArgs)
  if (!result.success) {
    return err(new Error(`Invalid arguments:\n  ${formatZodIssues(result.error.issues).message}`))
  }
  return ok(result.data as Record<string, unknown>)
}
