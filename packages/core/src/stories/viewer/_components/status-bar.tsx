import { Box, Spacer, Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import type { ViewerMode } from '../hooks/use-panel-focus.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StatusBar} component.
 */
interface StatusBarProps {
  readonly mode: ViewerMode
  readonly hasSelection: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Bottom status bar displaying mode indicator and context-sensitive
 * keyboard shortcut hints.
 *
 * @param props - The status bar props.
 * @returns A rendered status bar element.
 */
export function StatusBar({ mode, hasSelection }: StatusBarProps): ReactElement {
  return (
    <Box
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      <ModeIndicator mode={mode} />
      <Text> </Text>
      <Text dimColor>│</Text>
      <Text> </Text>
      {match(mode)
        .with('browse', () => <BrowseHints hasSelection={hasSelection} />)
        .with('edit', () => <EditHints />)
        .exhaustive()}
      <Spacer />
      <Text dimColor>q</Text>
      <Text>: quit</Text>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the mode indicator badge.
 *
 * @private
 * @param props - The mode indicator props.
 * @returns A rendered mode indicator element.
 */
function ModeIndicator({ mode }: { readonly mode: ViewerMode }): ReactElement {
  return (
    <Text
      bold
      color={match(mode)
        .with('browse', () => 'cyan' as const)
        .with('edit', () => 'yellow' as const)
        .exhaustive()}
    >
      {match(mode)
        .with('browse', () => '● Browse')
        .with('edit', () => '● Edit')
        .exhaustive()}
    </Text>
  )
}

/**
 * Render keyboard hints for browse mode.
 *
 * @private
 * @param props - The browse hints props.
 * @returns A rendered hints element.
 */
function BrowseHints({ hasSelection }: { readonly hasSelection: boolean }): ReactElement {
  return (
    <Box>
      <Text dimColor>↑↓</Text>
      <Text>: navigate</Text>
      <Text> </Text>
      <Text dimColor>enter</Text>
      <Text>: select/expand</Text>
      <Text> </Text>
      <Text dimColor>?</Text>
      <Text>: help</Text>
      {match(hasSelection)
        .with(true, () => (
          <Box>
            <Text> </Text>
            <Text dimColor>r</Text>
            <Text>: reset</Text>
          </Box>
        ))
        .with(false, () => null)
        .exhaustive()}
    </Box>
  )
}

/**
 * Render keyboard hints for edit mode.
 *
 * @private
 * @returns A rendered hints element.
 */
function EditHints(): ReactElement {
  return (
    <Box>
      <Text dimColor>↑↓</Text>
      <Text>: field</Text>
      <Text> </Text>
      <Text dimColor>esc</Text>
      <Text>: back to stories</Text>
      <Text> </Text>
      <Text dimColor>r</Text>
      <Text>: reset</Text>
      <Text> </Text>
      <Text dimColor>?</Text>
      <Text>: help</Text>
    </Box>
  )
}
