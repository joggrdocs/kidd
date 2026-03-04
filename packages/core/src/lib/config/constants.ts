/**
 * Supported configuration file formats.
 */
export type ConfigFormat = 'json' | 'jsonc' | 'yaml'

export { JSON_INDENT } from '@/utils/constants.js'
export const EMPTY_LENGTH = 0
export const CONFIG_EXTENSIONS = ['.jsonc', '.json', '.yaml'] as const
