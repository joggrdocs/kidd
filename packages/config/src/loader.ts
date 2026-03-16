import type { AsyncResult } from '@kidd-cli/utils'
import { err, ok, toError } from '@kidd-cli/utils/fp'
import type { Tagged } from '@kidd-cli/utils/tag'
import { withTag } from '@kidd-cli/utils/tag'
import { loadConfig as c12LoadConfig } from 'c12'
import { attemptAsync } from 'es-toolkit'

import { validateConfig } from './schema.js'
import type { KiddConfig } from './types.js'

export { KiddConfigSchema, validateConfig } from './schema.js'

/**
 * Options for loading a kidd build config.
 */
export interface LoadConfigOptions {
  /**
   * Working directory to search from.
   */
  readonly cwd?: string
  /**
   * Default values merged under the loaded config.
   */
  readonly defaults?: Partial<KiddConfig>
  /**
   * Override values merged over the loaded config.
   */
  readonly overrides?: Partial<KiddConfig>
}

/**
 * Successful result of loading a kidd build config.
 */
export interface LoadConfigResult {
  /**
   * The validated and tagged build config.
   */
  readonly config: Tagged<KiddConfig, 'KiddConfig'>
  /**
   * Path to the resolved config file, or `undefined` when none was found.
   */
  readonly configFile: string | undefined
}

/**
 * Load and validate a `kidd.config.ts` file using c12.
 *
 * Searches for a config file named `kidd` (e.g. `kidd.config.ts`, `kidd.config.mts`)
 * in the given working directory, validates it against the build config schema,
 * and returns a tagged config object.
 *
 * @param options - Optional loader configuration.
 * @returns A Result tuple - `[null, LoadConfigResult]` on success or `[Error, null]` on failure.
 */
export async function loadConfig(
  options?: LoadConfigOptions
): AsyncResult<LoadConfigResult, Error> {
  const { cwd, defaults, overrides } = options ?? {}

  const [loadError, loaded] = await attemptAsync(() =>
    c12LoadConfig({
      cwd,
      defaults,
      name: 'kidd',
      overrides,
    })
  )

  if (loadError || !loaded) {
    return err(`Failed to load kidd config: ${toError(loadError).message}`)
  }

  const [validateError, config] = validateConfig(loaded.config)
  if (validateError) {
    return err(validateError)
  }

  return ok({
    config: withTag(config, 'KiddConfig'),
    configFile: loaded.configFile,
  })
}
