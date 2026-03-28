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
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { match } from 'ts-pattern'

import type { NormalizedKeyEvent, ParsedKeyPattern } from './keys.js'
import { matchesSequence, matchesSingleKey, normalizeKey, parseKeyPattern } from './keys.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default timeout in ms for multi-key sequences. */
const DEFAULT_SEQUENCE_TIMEOUT = 300

/** Minimum key history entries retained for sequence matching. */
const MIN_HISTORY_LENGTH = 10

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
 * Arguments for the {@link useKeyBinding} hook.
 */
export interface UseKeyBindingArgs extends KeyBindingOptions {
  readonly bindings: readonly KeyBinding[]
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
 * @param args - Key bindings and optional runtime configuration.
 * @returns Nothing.
 */
export function useKeyBinding({
  bindings,
  isActive = true,
  sequenceTimeout = DEFAULT_SEQUENCE_TIMEOUT,
}: UseKeyBindingArgs): void {
  const historyRef = useRef<KeyHistoryEntry[]>([])
  const bindingsRef = useRef(bindings)
  const prevActiveRef = useRef(isActive)

  useEffect(() => {
    bindingsRef.current = bindings
  }, [bindings])

  useEffect(() => {
    if (isActive && !prevActiveRef.current) {
      historyRef.current = []
    }
    prevActiveRef.current = isActive
  }, [isActive])

  const parsedPatterns = useMemo<readonly ParsedKeyPattern[]>(
    () => bindings.map((b) => parseKeyPattern(b.keys)),
    [bindings]
  )

  const maxHistory = useMemo(() => resolveMaxHistory(parsedPatterns), [parsedPatterns])

  const inputHandler = useCallback(
    (input: string, key: Key) => {
      const normalized = normalizeKey(input, key)
      const entry: KeyHistoryEntry = { ...normalized, timestamp: Date.now() }

      historyRef.current = [...historyRef.current.slice(-(maxHistory - 1)), entry]

      const matchedIndex = parsedPatterns.findIndex((pattern) =>
        checkBinding(pattern, normalized, historyRef.current, sequenceTimeout)
      )

      if (matchedIndex !== -1) {
        bindingsRef.current[matchedIndex]?.action()
      }
    },
    [parsedPatterns, sequenceTimeout, maxHistory]
  )

  useInput(inputHandler, { isActive })
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Derive the history buffer size from the longest sequence binding.
 *
 * Returns at least {@link MIN_HISTORY_LENGTH} so the buffer is never
 * smaller than a reasonable default, even when no sequence bindings
 * are registered.
 *
 * @private
 * @param patterns - The parsed key patterns from all bindings.
 * @returns The required history length.
 */
function resolveMaxHistory(patterns: readonly ParsedKeyPattern[]): number {
  const longest = patterns.reduce((max, p) => Math.max(max, resolvePatternLength(p)), 0)
  return Math.max(longest, MIN_HISTORY_LENGTH)
}

/**
 * Get the effective length of a parsed key pattern.
 *
 * @private
 * @param pattern - The parsed key pattern.
 * @returns The number of key events the pattern requires.
 */
function resolvePatternLength(pattern: ParsedKeyPattern): number {
  return match(pattern)
    .with({ type: 'single' }, () => 1)
    .with({ type: 'sequence' }, (p) => p.steps.length)
    .exhaustive()
}

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
