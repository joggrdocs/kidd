import type { Key } from 'ink'
import { useInput as useInkInput } from 'ink'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for the {@link useInput} hook.
 */
export interface UseInputOptions {
  /** Whether this specific hook instance is active. Defaults to `true`. */
  readonly isActive?: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Input hook with the same `(input, key)` signature as ink's `useInput`.
 * Components control activation via `isActive` (typically `focused && !disabled`).
 *
 * @param handler - Callback invoked on each key press.
 * @param options - Optional configuration for the hook.
 */
export function useInput(
  handler: (input: string, key: Key) => void,
  options: UseInputOptions = {}
): void {
  const { isActive = true } = options

  useInkInput(handler, { isActive })
}
