/**
 * StatusMessage UI component.
 *
 * Renders an icon and message colored according to a variant. Useful for
 * displaying success, error, warning, or informational messages in a
 * consistent style.
 *
 * @module
 */

import { Text } from 'ink'
import type { ReactElement, ReactNode } from 'react'
import { match } from 'ts-pattern'

import type { Variant } from '../theme.js'
import { resolveVariantColor, symbols } from '../theme.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The visual variant of a status message.
 */
export type StatusMessageVariant = Variant

/**
 * Props for the {@link StatusMessage} component.
 */
export interface StatusMessageProps {
  /** The message content to display beside the icon. */
  readonly children: ReactNode

  /** The variant determines the icon and color. */
  readonly variant: StatusMessageVariant
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * A status message with a colored icon indicating the variant.
 *
 * Renders a symbol (tick, cross, warning, or circle) in the variant color
 * followed by the message content. Ideal for command output lines that
 * communicate success, failure, warnings, or information.
 *
 * @param props - The status message props.
 * @returns A rendered status message element.
 */
export function StatusMessage({ children, variant }: StatusMessageProps): ReactElement {
  const icon = resolveIcon(variant)
  const color = resolveVariantColor(variant)

  return (
    <Text>
      <Text color={color}>{icon}</Text>
      <Text>{` ${String(children)}`}</Text>
    </Text>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve the symbol icon for a given status variant.
 *
 * @private
 * @param variant - The status message variant.
 * @returns The icon string.
 */
function resolveIcon(variant: StatusMessageVariant): string {
  return match(variant)
    .with('info', () => symbols.circle)
    .with('success', () => symbols.tick)
    .with('error', () => symbols.cross)
    .with('warning', () => symbols.warning)
    .exhaustive()
}
