/**
 * Shared option row component for prompt lists.
 *
 * Used by Select, MultiSelect, and other prompt components that render
 * a vertical list of focusable options with indicator, label, and hint.
 *
 * @module
 */

import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import { colors, symbols } from '../theme.js'
import type { PromptOption } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link OptionRow} component.
 */
export interface OptionRowProps<TValue> {
  /** The option to render. */
  readonly option: PromptOption<TValue>

  /** The indicator symbol (e.g. radio or checkbox). */
  readonly indicator: string

  /** Whether this row is currently focused by the cursor. */
  readonly isFocused: boolean

  /** Whether this row is the selected/checked option. */
  readonly isSelected: boolean

  /** Whether the entire prompt is disabled. */
  readonly isDisabled: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Render a single option row with pointer, indicator, label, and hint.
 *
 * Shared by Select, MultiSelect, and similar prompt components to ensure
 * consistent styling and keyboard focus behavior.
 *
 * @param props - The option row props.
 * @returns A rendered option row element.
 */
export function OptionRow<TValue>({
  option,
  indicator,
  isFocused,
  isSelected,
  isDisabled,
}: OptionRowProps<TValue>): ReactElement {
  const isOptionDisabled = option.disabled === true || isDisabled

  return (
    <Box>
      <Text dimColor={!isFocused}>
        {match(isFocused)
          .with(true, () => `${symbols.pointer} `)
          .with(false, () => '  ')
          .exhaustive()}
      </Text>
      <Text
        color={match({ isSelected, isFocused })
          .with({ isSelected: true }, () => colors.primary)
          .with({ isFocused: true }, () => colors.primary)
          .otherwise(() => undefined)}
        dimColor={isOptionDisabled}
      >
        {indicator}
      </Text>
      <Text> </Text>
      <Text
        color={match(isFocused)
          .with(true, () => colors.primary)
          .with(false, () => undefined)
          .exhaustive()}
        dimColor={isOptionDisabled}
        strikethrough={option.disabled === true}
      >
        {option.label}
      </Text>
      {match(option.hint)
        .with(undefined, () => null)
        .otherwise((hint) => (
          <Text dimColor>{`  ${hint}`}</Text>
        ))}
    </Box>
  )
}
