/**
 * Supported configuration file formats for reading.
 */
export type ConfigFormat = 'json' | 'jsonc' | 'js' | 'ts' | 'yaml'

/**
 * Supported configuration file formats for writing.
 */
export type ConfigWriteFormat = 'json' | 'jsonc' | 'yaml'

/**
 * File extensions allowed for the short config name (e.g. `jog.json`, `jog.yaml`).
 *
 * TS/JS extensions are excluded — use the `name.config.*` pattern for those.
 */
export const DATA_EXTENSIONS: ReadonlySet<string> = new Set([
  '.json',
  '.jsonc',
  '.json5',
  '.yaml',
  '.yml',
  '.toml',
])
