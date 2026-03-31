import { useHotkey } from '../../../ui/use-key-binding.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for the {@link useDoubleEscape} hook.
 */
interface DoubleEscapeOptions {
  readonly onExit: () => void
  readonly active: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Listen for a double-press Escape sequence and call `onExit` when detected.
 * The binding is only active when `active` is `true`, allowing the caller
 * to enable it only in interactive mode.
 *
 * @param options - The hook options with exit callback and active state.
 * @returns Nothing. Registers the key binding side effect.
 */
export function useDoubleEscape({ onExit, active }: DoubleEscapeOptions): void {
  useHotkey({ keys: ['escape escape'], action: onExit, active })
}
