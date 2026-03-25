/**
 * Symbol key and carrier interface for attaching the {@link OutputStore}
 * to the screen context.
 *
 * @module
 */

import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Symbol key used to attach the {@link OutputStore} to the screen context.
 * Components retrieve it via `useOutputStore()` to render `<Output />`.
 */
export const OUTPUT_STORE_KEY: unique symbol = Symbol('kidd.outputStore')

/**
 * Type helper for accessing the output store on a screen context.
 */
export interface OutputStoreCarrier {
  readonly [OUTPUT_STORE_KEY]: OutputStore
}
