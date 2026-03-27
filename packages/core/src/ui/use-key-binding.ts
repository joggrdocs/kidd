/**
 * Declarative keymap hook that binds key patterns to action callbacks.
 * Supports single keys, modifier combinations, and multi-key sequences
 * (e.g. double-press Escape). Wraps Ink's `useInput` and uses the shared
 * key vocabulary from `keys.ts`.
 *
 * @module
 */

import type { Key } from 'ink'
import { useInput } from 'ink'
import { useCallback, useMemo, useRef } from 'react'
import { match } from 'ts-pattern'

import type { NormalizedKeyEvent, ParsedKeyPattern } from './keys.js'
import { matchesSequence, matchesSingleKey, normalizeKey, parseKeyPattern } from './keys.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default timeout in ms for multi-key sequences. */
const DEFAULT_SEQUENCE_TIMEOUT = 300

/** Maximum key history entries retained for sequence matching. */
const MAX_HISTORY_LENGTH = 10

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single key binding mapping a key pattern to an action callback.
 */
export interface KeyBinding {
  readonly keys: string
  readonly action: () => void
}

/**
 * Options for the {@link useKeyBinding} hook.
 */
export interface KeyBindingOptions {
  readonly isActive?: boolean
  readonly sequenceTimeout?: number
}

/**
 * A key history entry with timestamp for sequence matching.
 *
 * @private
 */
interface KeyHistoryEntry extends NormalizedKeyEvent {
  readonly timestamp: number
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Bind key patterns to action callbacks. First matching binding wins
 * (array order = priority). Supports single keys (`'q'`), modifier
 * combinations (`'ctrl+c'`), and space-separated sequences
 * (`'escape escape'`).
 *
 * @param bindings - Array of key bindings in priority order.
 * @param options - Optional configuration for active state and sequence timeout.
 */
export function useKeyBinding(
  bindings: readonly KeyBinding[],
  options: KeyBindingOptions = {}
): void {
  const { isActive = true, sequenceTimeout = DEFAULT_SEQUENCE_TIMEOUT } = options
  const historyRef = useRef<KeyHistoryEntry[]>([])
  const bindingsRef = useRef(bindings)
  bindingsRef.current = bindings

  const parsedPatterns = useMemo<readonly ParsedKeyPattern[]>(
    () => bindings.map((b) => parseKeyPattern(b.keys)),
    [bindings]
  )

  const inputHandler = useCallback(
    (input: string, key: Key) => {
      const normalized = normalizeKey(input, key)
      const entry: KeyHistoryEntry = { ...normalized, timestamp: Date.now() }

      historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY_LENGTH - 1)), entry]

      const matchedIndex = parsedPatterns.findIndex((pattern) =>
        checkBinding(pattern, normalized, historyRef.current, sequenceTimeout)
      )

      if (matchedIndex !== -1) {
        bindingsRef.current[matchedIndex]?.action()
      }
    },
    [parsedPatterns, sequenceTimeout]
  )

  useInput(inputHandler, { isActive })
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Check whether a normalized key event (and recent history) matches a
 * parsed key pattern.
 *
 * @private
 * @param pattern - The parsed key pattern to check.
 * @param event - The current normalized key event.
 * @param history - Recent key history entries with timestamps.
 * @param timeout - Sequence timeout in ms.
 * @returns `true` when the event matches the pattern.
 */
function checkBinding(
  pattern: ParsedKeyPattern,
  event: NormalizedKeyEvent,
  history: readonly KeyHistoryEntry[],
  timeout: number
): boolean {
  return match(pattern)
    .with({ type: 'single' }, (p) => matchesSingleKey(p, event))
    .with({ type: 'sequence' }, (p) => matchesSequence(p, history, timeout))
    .exhaustive()
}
