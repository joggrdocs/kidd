/**
 * Screen-backed {@link Log} implementation that pushes entries
 * to an {@link OutputStore} instead of writing to stderr.
 *
 * @module
 */

import type { Log } from '@/context/types.js'

import type { OutputStore } from './types.js'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Create a {@link Log} instance that writes to an {@link OutputStore}
 * for rendering by the `<Output />` component.
 *
 * @param store - The output store to push entries to.
 * @returns A frozen Log instance compatible with `ctx.log`.
 */
export function createScreenLog(store: OutputStore): Log {
  return Object.freeze({
    info(message: string): void {
      store.push({ kind: 'log', level: 'info', text: message })
    },

    success(message: string): void {
      store.push({ kind: 'log', level: 'success', text: message })
    },

    error(message: string): void {
      store.push({ kind: 'log', level: 'error', text: message })
    },

    warn(message: string): void {
      store.push({ kind: 'log', level: 'warn', text: message })
    },

    step(message: string): void {
      store.push({ kind: 'log', level: 'step', text: message })
    },

    message(message: string, opts?: { readonly symbol?: string }): void {
      store.push({ kind: 'log', level: 'message', text: message, symbol: opts?.symbol })
    },

    intro(_title?: string): void {
      // No-op in screen context — screens handle their own layout
    },

    outro(_message?: string): void {
      // No-op in screen context — screens handle their own exit
    },

    note(_message?: string, _title?: string): void {
      // No-op in screen context — use Box/Text for notes
    },

    newline(): void {
      store.push({ kind: 'newline' })
    },

    raw(text: string): void {
      store.push({ kind: 'raw', text })
    },
  }) satisfies Log
}
