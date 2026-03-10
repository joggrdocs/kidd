import { extname } from 'node:path'

import { attempt, err, match } from '@kidd-cli/utils/fp'
import { jsonParse, jsonStringify } from '@kidd-cli/utils/json'
import type { ParseError } from 'jsonc-parser'
import { parse as parseJsonc, printParseErrorCode } from 'jsonc-parser'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

import type { ConfigFormat } from './constants.js'
import { EMPTY_LENGTH } from './constants.js'
import type { ConfigOperationResult } from './types.js'

/**
 * Determine the config format from a file path's extension.
 *
 * @param filePath - The file path to inspect.
 * @returns The detected config format ('json', 'jsonc', or 'yaml').
 */
export function getFormat(filePath: string): ConfigFormat {
  const ext = extname(filePath)
  return match(ext)
    .with('.jsonc', () => 'jsonc' as const)
    .with('.yaml', () => 'yaml' as const)
    .otherwise(() => 'json' as const)
}

/**
 * Options for parsing config file content.
 */
export interface ParseContentOptions {
  readonly content: string
  readonly filePath: string
  readonly format: ConfigFormat
}

/**
 * Parse config file content using the appropriate parser for the given format.
 *
 * @param options - Parse content options.
 * @returns A ConfigOperationResult with the parsed data or an error.
 */
export function parseContent(options: ParseContentOptions): ConfigOperationResult<unknown> {
  const { content, filePath, format } = options
  return match(format)
    .with('json', () => parseJson(content, filePath))
    .with('jsonc', () => parseJsoncContent(content, filePath))
    .with('yaml', () => parseYamlContent(content, filePath))
    .exhaustive()
}

/**
 * Serialize data to a string in the specified config format.
 *
 * @param data - The data to serialize.
 * @param format - The target config format.
 * @returns The serialized string representation.
 */
export function serializeContent(data: unknown, format: ConfigFormat): string {
  return match(format)
    .with('json', () => {
      const [, json] = jsonStringify(data, { pretty: true })
      return `${json}\n`
    })
    .with('jsonc', () => {
      const [, json] = jsonStringify(data, { pretty: true })
      return `${json}\n`
    })
    .with('yaml', () => stringifyYaml(data))
    .exhaustive()
}

/**
 * Get the file extension string for a given config format.
 *
 * @param format - The config format.
 * @returns The file extension including the leading dot (e.g. '.json').
 */
export function getExtension(format: ConfigFormat): string {
  return match(format)
    .with('json', () => '.json')
    .with('jsonc', () => '.jsonc')
    .with('yaml', () => '.yaml')
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Parse a JSON string and return the result as a ConfigOperationResult.
 *
 * @param content - The raw JSON string to parse.
 * @param filePath - The file path used in error messages.
 * @returns A ConfigOperationResult with the parsed data or a parse error.
 * @private
 */
function parseJson(content: string, filePath: string): ConfigOperationResult<unknown> {
  const [error, result] = jsonParse(content)
  if (error) {
    return err(`Failed to parse JSON in ${filePath}: ${error.message}`)
  }
  return [null, result]
}

/**
 * Parse a JSONC (JSON with comments) string and return the result as a ConfigOperationResult.
 *
 * @param content - The raw JSONC string to parse.
 * @param filePath - The file path used in error messages.
 * @returns A ConfigOperationResult with the parsed data or a parse error.
 * @private
 */
function parseJsoncContent(
  content: string,
  filePath: string
): ConfigOperationResult<unknown> {
  const errors: ParseError[] = []
  const result = parseJsonc(content, errors, {
    allowEmptyContent: false,
    allowTrailingComma: true,
  })
  if (errors.length > EMPTY_LENGTH) {
    const errorMessages = errors
      .map(
        (parseError) =>
          `  - ${printParseErrorCode(parseError.error)} at offset ${parseError.offset}`
      )
      .join('\n')
    return err(`Failed to parse JSONC in ${filePath}:\n${errorMessages}`)
  }
  return [null, result]
}

/**
 * Parse a YAML string and return the result as a ConfigOperationResult.
 *
 * @param content - The raw YAML string to parse.
 * @param filePath - The file path used in error messages.
 * @returns A ConfigOperationResult with the parsed data or a parse error.
 * @private
 */
function parseYamlContent(
  content: string,
  filePath: string
): ConfigOperationResult<unknown> {
  const [error, result] = attempt(() => parseYaml(content))
  if (error) {
    return err(`Failed to parse YAML in ${filePath}: ${String(error)}`)
  }
  return [null, result]
}
