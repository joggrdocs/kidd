import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHORTCUTS = [
  { key: 'Tab', description: 'Cycle panel focus' },
  { key: 'Up/Down', description: 'Navigate' },
  { key: 'Enter', description: 'Select story / confirm' },
  { key: 'r', description: 'Reset props to defaults' },
  { key: '?', description: 'Toggle help' },
  { key: 'q', description: 'Quit' },
] as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link HelpOverlay} component.
 */
interface HelpOverlayProps {
  readonly onClose: () => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Modal overlay displaying available keyboard shortcuts. Closes when
 * the user presses `?` or `q`.
 *
 * @param props - The help overlay props.
 * @returns A rendered help overlay element.
 */
export function HelpOverlay({ onClose }: HelpOverlayProps): ReactElement {
  useInput((input) => {
    if (input === '?' || input === 'q') {
      onClose()
    }
  })

  return (
    <Box flexDirection="column" borderStyle="double" padding={1}>
      <Text bold>Keyboard Shortcuts</Text>
      <Text> </Text>
      {SHORTCUTS.map((shortcut) => (
        <Box key={shortcut.key} gap={2}>
          <Box width={12}>
            <Text color="cyan">{shortcut.key}</Text>
          </Box>
          <Text>{shortcut.description}</Text>
        </Box>
      ))}
    </Box>
  )
}
