import { attempt } from 'es-toolkit'

import type { Result } from './fp/result.js'
import { err, ok } from './fp/result.js'

const JSON_INDENT = 2

/**
 * Options for {@link jsonStringify}.
 */
export interface JsonStringifyOptions {
  /**
   * Pretty-print with 2-space indentation. Defaults to false.
   */
  readonly pretty?: boolean
}

/**
 * Parse a JSON string into an unknown value, returning a {@link Result} instead of throwing.
 *
 * @param raw - The JSON string to parse.
 * @returns A Result tuple with the parsed value or an error message.
 */
export function jsonParse(raw: string): Result<unknown> {
  const [error, value] = attempt<unknown, Error>(() => JSON.parse(raw) as unknown)
  if (error) {
    return err(`Failed to parse JSON: ${error.message}`)
  }
  return ok(value)
}

/**
 * Serialize a value to a JSON string, returning a {@link Result} instead of throwing.
 *
 * @param data - The value to serialize.
 * @param options - Serialization options.
 * @returns A Result tuple with the JSON string or an error message.
 */
export function jsonStringify(data: unknown, options: JsonStringifyOptions = {}): Result<string> {
  const { pretty = false } = options
  const [error, value] = attempt<string, Error>(() => {
    if (pretty) {
      return JSON.stringify(data, null, JSON_INDENT)
    }
    return JSON.stringify(data)
  })
  if (error) {
    return err(`Failed to stringify JSON: ${error.message}`)
  }
  return ok(value)
}
