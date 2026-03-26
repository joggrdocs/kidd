/**
 * Utility functions for attaching and retrieving the {@link OutputStore}
 * on a screen context object via a hidden Symbol key.
 *
 * @module
 */

import type { ScreenContext } from '../../context/types.js'
import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Symbol key used to attach the {@link OutputStore} to the screen context.
 *
 * @private
 */
const OUTPUT_STORE_KEY: unique symbol = Symbol('kidd.outputStore')

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Return a new context with the {@link OutputStore} attached via a hidden
 * Symbol key. Does not mutate the original context.
 *
 * @param ctx - The screen context record to extend.
 * @param store - The output store to attach.
 * @returns A new record containing all original entries plus the store.
 */
export function injectOutputStore(
  ctx: Record<string | symbol, unknown>,
  store: OutputStore
): Record<string | symbol, unknown> {
  return { ...ctx, [OUTPUT_STORE_KEY]: store }
}

/**
 * Retrieve the {@link OutputStore} from a screen context.
 *
 * @param ctx - The screen context to read from.
 * @returns The output store attached by {@link injectOutputStore}.
 */
export function getOutputStore(ctx: ScreenContext): OutputStore {
  return (ctx as unknown as Record<symbol, unknown>)[OUTPUT_STORE_KEY] as OutputStore
}
