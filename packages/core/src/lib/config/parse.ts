import { extname } from 'node:path'

import { match } from '@kidd-cli/utils/fp'
import { jsonStringify } from '@kidd-cli/utils/json'
import { stringify as yamlStringify } from 'yaml'

import type { ConfigFormat, ConfigWriteFormat } from './constants.js'

/**
 * Determine the config format from a file path's extension.
 *
 * @param filePath - The file path to inspect.
 * @returns The detected config format.
 */
export function getFormat(filePath: string): ConfigFormat {
  const ext = extname(filePath)
  return match(ext)
    .with('.jsonc', () => 'jsonc' as const)
    .with('.yaml', () => 'yaml' as const)
    .with('.yml', () => 'yaml' as const)
    .with('.ts', () => 'ts' as const)
    .with('.mts', () => 'ts' as const)
    .with('.cts', () => 'ts' as const)
    .with('.js', () => 'js' as const)
    .with('.mjs', () => 'js' as const)
    .with('.cjs', () => 'js' as const)
    .otherwise(() => 'json' as const)
}

/**
 * Serialize data to a string in the specified config format.
 *
 * @param data - The data to serialize.
 * @param format - The target config format.
 * @returns The serialized string representation.
 */
export function serializeContent(data: unknown, format: ConfigWriteFormat): string {
  return match(format)
    .with('json', 'jsonc', () => serializeJson(data))
    .with('yaml', () => yamlStringify(data))
    .exhaustive()
}

// ---------------------------------------------------------------------------

/**
 * Serialize data as pretty-printed JSON with a trailing newline.
 *
 * @private
 * @param data - The data to serialize.
 * @returns The JSON string, or a fallback `'{}\n'` on serialization failure.
 */
function serializeJson(data: unknown): string {
  const [serializeError, json] = jsonStringify(data, { pretty: true })
  if (serializeError) {
    return '{}\n'
  }
  return `${json}\n`
}

/**
 * Get the file extension string for a given write format.
 *
 * @param format - The config write format.
 * @returns The file extension including the leading dot (e.g. '.json').
 */
export function getExtension(format: ConfigWriteFormat): string {
  return match(format)
    .with('json', () => '.json')
    .with('jsonc', () => '.jsonc')
    .with('yaml', () => '.yaml')
    .exhaustive()
}
