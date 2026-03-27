/**
 * Select-by-key prompt component.
 *
 * Renders a list of options where each option is bound to a single
 * key character. Pressing the key immediately selects that option
 * without requiring Enter confirmation.
 *
 * @module
 */

import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import { colors } from '../theme.js'
import type { PromptOption } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link SelectKey} component.
 */
export interface SelectKeyProps<TValue extends string> {
  /** Options where each `value` is a single key character. */
  readonly options: readonly PromptOption<TValue>[]

  /** Called when the user presses a matching key. */
  readonly onSubmit?: (value: TValue) => void

  /** When `true`, the component does not respond to input. */
  readonly isDisabled?: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Key-press driven select prompt where each option maps to a single key.
 *
 * Renders options in a vertical list with the key character highlighted
 * in cyan and bold. Pressing the corresponding key immediately fires
 * `onSubmit`. Disabled options are shown dimmed and their key presses
 * are ignored.
 *
 * @param props - The select-key props.
 * @returns A rendered select-key element.
 */
export function SelectKey<TValue extends string>({
  options,
  onSubmit,
  isDisabled = false,
}: SelectKeyProps<TValue>): ReactElement {
  useInput(
    (input) => {
      const matched = options.find((opt) => opt.value === input)
      if (matched === undefined || matched.disabled) {
        return
      }
      if (onSubmit) {
        onSubmit(matched.value)
      }
    },
    { isActive: !isDisabled }
  )

  return (
    <Box flexDirection="column">
      {options.map((option) => (
        <KeyOptionRow key={option.value} option={option} isDisabled={isDisabled} />
      ))}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link KeyOptionRow} component.
 *
 * @private
 */
interface KeyOptionRowProps<TValue extends string = string> {
  readonly option: PromptOption<TValue>
  readonly isDisabled: boolean
}

/**
 * Render a single option row with the key character highlighted.
 *
 * @private
 * @param props - The row props.
 * @returns A rendered row element.
 */
function KeyOptionRow({ option, isDisabled }: KeyOptionRowProps): ReactElement {
  const disabled = isDisabled || (option.disabled ?? false)
  const keyChar = option.value.charAt(0)
  const restLabel = option.label.slice(1)
  const startsWithKey = option.label.charAt(0).toLowerCase() === keyChar.toLowerCase()

  return (
    <Box>
      {match(disabled)
        .with(true, () => (
          <Text dimColor>
            {'  '}[{keyChar}] {option.label}
          </Text>
        ))
        .with(false, () => (
          <Box>
            <Text>{'  '}</Text>
            <Text>[</Text>
            <Text color={colors.primary} bold>
              {keyChar}
            </Text>
            <Text>] </Text>
            {match(startsWithKey)
              .with(true, () => (
                <Text>
                  <Text color={colors.primary} bold>
                    {option.label.charAt(0)}
                  </Text>
                  {restLabel}
                </Text>
              ))
              .with(false, () => <Text>{option.label}</Text>)
              .exhaustive()}
          </Box>
        ))
        .exhaustive()}
      {match(option.hint)
        .with(undefined, () => null)
        .otherwise((hint) => (
          <Text dimColor> {hint}</Text>
        ))}
    </Box>
  )
}
