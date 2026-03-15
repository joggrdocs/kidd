import type { ZodTypeAny } from 'zod'

import type { ConfigFormat, ConfigWriteFormat } from './constants.js'

/**
 * Options for creating a config client.
 */
export interface ConfigOptions<TSchema extends ZodTypeAny> {
  readonly name: string
  readonly schema: TSchema
  readonly searchPaths?: readonly string[]
}

/**
 * Result of loading a config file: the parsed config, its path, and format.
 */
export interface ConfigResult<TConfig> {
  readonly config: TConfig
  readonly filePath: string
  readonly format: ConfigFormat
}

/**
 * Options for writing a config file.
 */
export interface ConfigWriteOptions {
  readonly dir?: string
  readonly format?: ConfigWriteFormat
  readonly filePath?: string
}

/**
 * Result of writing a config file.
 */
export interface ConfigWriteResult {
  readonly filePath: string
  readonly format: ConfigWriteFormat
}

/**
 * Result type for config operations.
 */
export type ConfigOperationResult<TResult> = readonly [Error, null] | readonly [null, TResult]

/**
 * Options for searching a dotfile config across directories.
 */
export interface FindDotfileOptions {
  readonly cwd: string
  readonly fileNames: readonly string[]
  readonly searchPaths?: readonly string[]
}

/**
 * Options for searching a single directory for config files.
 */
export interface FindConfigFileOptions {
  readonly dir: string
  readonly fileNames: readonly string[]
}

/**
 * Config client for loading, finding, and writing config files.
 */
export interface Config<TConfig> {
  readonly load: (
    cwd?: string
  ) => Promise<ConfigOperationResult<ConfigResult<TConfig>> | readonly [null, null]>
  readonly find: (cwd?: string) => Promise<string | null>
  readonly write: (
    data: TConfig,
    options?: ConfigWriteOptions
  ) => Promise<ConfigOperationResult<ConfigWriteResult>>
}
