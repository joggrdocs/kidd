// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A single option in a prompt component.
 *
 * Replaces `@inkjs/ui`'s `Option` (`{ label: string, value: string }`)
 * with support for generic values, disabled state, and hint text.
 *
 * @typeParam TValue - The type of the option's value.
 */
export interface PromptOption<TValue> {
  /** The value returned when this option is selected. */
  readonly value: TValue

  /** The display label shown to the user. */
  readonly label: string

  /** Optional hint text shown dimmed beside the label. */
  readonly hint?: string

  /** When `true`, the option is shown but not selectable. */
  readonly disabled?: boolean
}
