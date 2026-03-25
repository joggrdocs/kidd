/**
 * Screen-backed {@link Spinner} implementation that updates
 * spinner state in an {@link OutputStore} instead of writing to stderr.
 *
 * @module
 */

import type { Spinner } from '@/context/types.js'

import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Create a {@link Spinner} instance that manages state in an {@link OutputStore}
 * for rendering by the `<Output />` component.
 *
 * @param store - The output store to update spinner state on.
 * @returns A frozen Spinner instance compatible with `ctx.spinner`.
 */
export function createScreenSpinner(store: OutputStore): Spinner {
  return Object.freeze({
    start(message?: string): void {
      store.setSpinner({
        status: 'spinning',
        message: message ?? 'Loading...',
      })
    },

    stop(message?: string): void {
      store.setSpinner({
        status: 'stopped',
        message: message ?? '',
      })
    },

    message(text: string): void {
      store.setSpinner({
        status: 'spinning',
        message: text,
      })
    },
  }) satisfies Spinner
}
