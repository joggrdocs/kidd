import { Box, Spacer, Text } from 'ink'
import type { ReactElement } from 'react'
import { match } from 'ts-pattern'

import type { PanelId } from '../hooks/use-panel-focus.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StatusBar} component.
 */
interface StatusBarProps {
  readonly activePanel: PanelId
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Bottom status bar displaying keyboard shortcut hints and a tab indicator
 * showing the currently active panel.
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
      <TabIndicator activePanel={activePanel} />
      <Text> </Text>
      <Text dimColor>│</Text>
      <Text> </Text>
      <Text dimColor>enter</Text>
      <Text>: select</Text>
      <Text> </Text>
      <Text dimColor>tab</Text>
      <Text>: switch</Text>
      <Text> </Text>
      <Text dimColor>r</Text>
      <Text>: reset</Text>
      <Text> </Text>
      <Text dimColor>?</Text>
      <Text>: help</Text>
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
 * Render the tab indicator showing which panel is currently active.
 *
 * @private
 * @param props - The tab indicator props.
 * @returns A rendered tab indicator element.
 */
function TabIndicator({ activePanel }: { readonly activePanel: PanelId }): ReactElement {
  return (
    <Box gap={1}>
      <Text
        bold={activePanel === 'sidebar'}
        color={match(activePanel)
          .with('sidebar', () => 'cyan' as const)
          .with('editor', () => undefined)
          .exhaustive()}
      >
        {match(activePanel)
          .with('sidebar', () => '▸ Stories')
          .with('editor', () => '  Stories')
          .exhaustive()}
      </Text>
      <Text
        bold={activePanel === 'editor'}
        color={match(activePanel)
          .with('editor', () => 'cyan' as const)
          .with('sidebar', () => undefined)
          .exhaustive()}
      >
        {match(activePanel)
          .with('editor', () => '▸ Props')
          .with('sidebar', () => '  Props')
          .exhaustive()}
      </Text>
    </Box>
  )
}
