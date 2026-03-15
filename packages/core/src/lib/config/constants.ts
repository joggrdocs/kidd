/**
 * Supported configuration file formats for reading.
 */
export type ConfigFormat = 'json' | 'jsonc' | 'js' | 'ts' | 'yaml'

/**
 * Supported configuration file formats for writing.
 */
export type ConfigWriteFormat = 'json' | 'jsonc' | 'yaml'

/**
 * Standard JSON indentation width.
 */
export { JSON_INDENT } from '@/utils/constants.js'

/**
 * Sentinel for empty-length checks.
 */
export const EMPTY_LENGTH = 0

/**
 * Dotfile extensions used as fallback when c12 finds no `name.config.*` file.
 */
export const DOTFILE_EXTENSIONS = ['.json', '.jsonc', '.yaml'] as const
