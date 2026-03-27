/**
 * Thin wrapper hook that listens for a double-press Escape sequence
 * and invokes an exit callback. Used by the stories viewer to exit
 * interactive mode without intercepting single Escape presses.
 *
 * @module
 */

import { useMemo } from 'react'

import type { KeyBinding } from '../../../ui/use-key-binding.js'
import { useKeyBinding } from '../../../ui/use-key-binding.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for the {@link useDoubleEscape} hook.
 */
interface DoubleEscapeOptions {
  readonly onExit: () => void
  readonly isActive: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Listen for a double-press Escape sequence and call `onExit` when detected.
 * The binding is only active when `isActive` is `true`, allowing the caller
 * to enable it only in interactive mode.
 *
 * @param options - The hook options with exit callback and active state.
 */
export function useDoubleEscape({ onExit, isActive }: DoubleEscapeOptions): void {
  const bindings = useMemo<readonly KeyBinding[]>(
    () => [{ keys: 'escape escape', action: onExit }],
    [onExit]
  )
  useKeyBinding(bindings, { isActive })
}
