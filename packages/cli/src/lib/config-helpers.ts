import type { KiddConfig } from '@kidd-cli/config'
import type { LoadConfigResult } from '@kidd-cli/config/utils'

/**
 * Extract a KiddConfig from a load result, falling back to empty defaults.
 *
 * @param result - The result from loadConfig, or null when loading failed.
 * @returns The loaded config or an empty object (all KiddConfig fields are optional).
 */
export function extractConfig(result: LoadConfigResult | null): KiddConfig {
  if (result) {
    return result.config
  }

  return {}
}
