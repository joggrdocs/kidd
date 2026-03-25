/**
 * Hook to access the {@link OutputStore} from the screen context.
 *
 * @module
 */

import { useScreenContext } from '../provider.js'
import { OUTPUT_STORE_KEY } from './store-key.js'
import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Access the {@link OutputStore} attached to the current screen context.
 *
 * The store is attached by `screen()` using a private symbol key and
 * typed via {@link OutputStoreCarrier} on {@link ScreenContext}.
 * Used internally by `<Output />` and available for advanced use cases
 * that need direct store access.
 *
 * @returns The output store for the current screen.
 */
export function useOutputStore(): OutputStore {
  const ctx = useScreenContext()
  return ctx[OUTPUT_STORE_KEY]
}
