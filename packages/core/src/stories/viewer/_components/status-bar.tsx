import { Box, Spacer, Text } from 'ink'
import type { ReactElement } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StatusBar} component.
 */
interface StatusBarProps {
  readonly activePanel: string
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Bottom status bar displaying keyboard shortcut hints and the currently
 * active panel name.
 *
 * @param props - The status bar props.
 * @returns A rendered status bar element.
 */
export function StatusBar({ activePanel }: StatusBarProps): ReactElement {
  return (
    <Box
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      <Text dimColor>tab</Text>
      <Text>: panel</Text>
      <Text> | </Text>
      <Text dimColor>q</Text>
      <Text>: quit</Text>
      <Text> | </Text>
      <Text dimColor>r</Text>
      <Text>: reset</Text>
      <Text> | </Text>
      <Text dimColor>?</Text>
      <Text>: help</Text>
      <Spacer />
      <Text dimColor>{activePanel}</Text>
    </Box>
  )
}
