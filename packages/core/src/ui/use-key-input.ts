/**
 * Enhanced raw keyboard input hook that normalizes Ink's `useInput` callback
 * into a richer {@link KeyInputEvent} descriptor. Useful for components that
 * need character-by-character input handling with consistent key names.
 *
 * @module
 */

import type { Key } from 'ink'
import { useInput } from 'ink'
import { useCallback } from 'react'

import type { NormalizedKeyEvent } from './keys.js'
import { normalizeKey } from './keys.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A normalized keyboard event with the raw input string and resolved key name.
 */
export interface KeyInputEvent extends NormalizedKeyEvent {
  readonly input: string
}

/**
 * Options for the {@link useKeyInput} hook.
 */
export interface KeyInputOptions {
  readonly isActive?: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Enhanced raw input hook that wraps Ink's `useInput` with a normalized
 * {@link KeyInputEvent}. Maps Ink's `Key` boolean fields to a single `key`
 * string and passes through modifier flags for convenient pattern matching.
 *
 * @param handler - Callback invoked on each key press with a normalized event.
 * @param options - Optional configuration for the hook.
 */
export function useKeyInput(
  handler: (event: KeyInputEvent) => void,
  options: KeyInputOptions = {}
): void {
  const { isActive = true } = options

  const inputHandler = useCallback(
    (input: string, key: Key) => {
      handler({ ...normalizeKey(input, key), input })
    },
    [handler]
  )

  useInput(inputHandler, { isActive })
}
