import type { Tagged } from '@kidd/utils/tag'
import { withTag } from '@kidd/utils/tag'

import type { KiddConfig } from './types.js'

/**
 * Type-safe helper for kidd.config.ts.
 *
 * Tags the config with `'KiddConfig'` so consumers can verify
 * it was created through `defineConfig` at runtime via `hasTag`.
 *
 * @param config - The build configuration object.
 * @returns A tagged copy of the config.
 */
export function defineConfig(config: KiddConfig): Tagged<KiddConfig, 'KiddConfig'> {
  return withTag(config, 'KiddConfig')
}
