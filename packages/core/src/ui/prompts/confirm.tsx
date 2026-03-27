/**
 * Confirm prompt component.
 *
 * A boolean yes/no prompt for terminal UIs. Renders two toggle choices
 * that can be switched with left/right arrows or y/n keys. The active
 * choice is highlighted with cyan and underline styling.
 *
 * @module
 */

import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { match } from 'ts-pattern'

import { colors } from '../theme.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Confirm} component.
 */
export interface ConfirmProps {
  /** Label for the affirmative choice. @default "Yes" */
  readonly active?: string

  /** Label for the negative choice. @default "No" */
  readonly inactive?: string

  /** The initial value. @default true */
  readonly defaultValue?: boolean

  /** Callback fired when the value is submitted via Enter. */
  readonly onSubmit?: (value: boolean) => void

  /** When `true`, the component ignores all keyboard input. */
  readonly isDisabled?: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A boolean confirm prompt with toggle-style keyboard navigation.
 *
 * Renders two choices side by side. The active choice is styled with
 * cyan color and underline. Users toggle with left/right arrows or
 * y/n keys and submit with Enter.
 *
 * **Keyboard shortcuts:**
 * - Left/Right arrows — toggle between choices
 * - y — select the affirmative choice
 * - n — select the negative choice
 * - Enter — submit the current value
 *
 * @param props - The confirm component props.
 * @returns A rendered confirm element.
 */
export function Confirm({
  active = 'Yes',
  inactive = 'No',
  defaultValue = true,
  onSubmit,
  isDisabled = false,
}: ConfirmProps): ReactElement {
  const [value, setValue] = useState(defaultValue)

  useInput(
    (input, key) => {
      if (key.return) {
        if (onSubmit) {
          onSubmit(value)
        }
        return
      }

      if (key.leftArrow || key.rightArrow) {
        setValue(!value)
        return
      }

      if (input === 'y' || input === 'Y') {
        setValue(true)
        return
      }

      if (input === 'n' || input === 'N') {
        setValue(false)
      }
    },
    { isActive: !isDisabled }
  )

  return (
    <Box gap={1}>
      <ConfirmChoice label={active} isActive={value} isDisabled={isDisabled} />
      <Text dimColor>/</Text>
      <ConfirmChoice label={inactive} isActive={!value} isDisabled={isDisabled} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link ConfirmChoice} component.
 *
 * @private
 */
interface ConfirmChoiceProps {
  readonly label: string
  readonly isActive: boolean
  readonly isDisabled: boolean
}

/**
 * Render a single confirm choice with active/inactive styling.
 *
 * @private
 * @param props - The choice props.
 * @returns A rendered choice element.
 */
function ConfirmChoice({ label, isActive, isDisabled }: ConfirmChoiceProps): ReactElement {
  const color = match({ isActive, isDisabled })
    .with({ isDisabled: true }, () => undefined)
    .with({ isActive: true }, () => colors.primary)
    .otherwise(() => undefined)

  return (
    <Text color={color} dimColor={!isActive || isDisabled} underline={isActive && !isDisabled}>
      {label}
    </Text>
  )
}
