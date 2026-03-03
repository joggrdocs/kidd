import type { ZodTypeAny } from 'zod'

import type { ConfigFormat } from './constants.js'

/**
 * Options for creating a config client.
 */
export interface ConfigOptions<TSchema extends ZodTypeAny> {
  name: string
  schema: TSchema
  searchPaths?: string[]
}

/**
 * Result of loading a config file: the parsed config, its path, and format.
 */
export interface ConfigResult<TConfig> {
  config: TConfig
  filePath: string
  format: ConfigFormat
}

/**
 * Options for writing a config file.
 */
export interface ConfigWriteOptions {
  dir?: string
  format?: ConfigFormat
  filePath?: string
}

/**
 * Result of writing a config file.
 */
export interface ConfigWriteResult {
  filePath: string
  format: ConfigFormat
}

/**
 * Result type for config operations.
 */
export type ConfigOperationResult<TResult> = readonly [Error, null] | readonly [null, TResult]

/**
 * Config client for loading, finding, and writing config files.
 */
export interface Config<TConfig> {
  load(cwd?: string): Promise<ConfigOperationResult<ConfigResult<TConfig>> | readonly [null, null]>
  find(cwd?: string): Promise<string | null>
  write(
    data: TConfig,
    options?: ConfigWriteOptions
  ): Promise<ConfigOperationResult<ConfigWriteResult>>
}
