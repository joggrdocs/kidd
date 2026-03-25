/**
 * Hook to access the {@link OutputStore} from the screen context.
 *
 * @module
 */

import { useScreenContext } from '../provider.js'
import { OUTPUT_STORE_KEY } from '../screen.js'
import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Access the {@link OutputStore} attached to the current screen context.
 *
 * The store is attached by `screen()` using a private symbol key.
 * Use this to pass the store to `<Output />` for rendering.
 *
 * @returns The output store for the current screen.
 */
export function useOutputStore(): OutputStore {
  const ctx = useScreenContext()
  return (ctx as unknown as Record<symbol, unknown>)[OUTPUT_STORE_KEY] as OutputStore
}
