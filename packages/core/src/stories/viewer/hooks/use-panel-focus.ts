import { useCallback, useState } from 'react'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Identifier for a focusable panel in the stories viewer.
 */
export type PanelId = 'sidebar' | 'editor'

/**
 * State and controls for managing panel focus in the stories viewer.
 */
export interface PanelFocusState {
  readonly activePanel: PanelId
  readonly cyclePanel: () => void
  readonly setPanel: (panel: PanelId) => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Manage focus state between the sidebar and editor panels.
 * Provides a cycle function for tab-based navigation and a direct
 * setter for programmatic focus changes.
 *
 * @returns The current panel focus state and control functions.
 */
export function usePanelFocus(): PanelFocusState {
  const [activePanel, setActivePanel] = useState<PanelId>('sidebar')

  const cyclePanel = useCallback(() => {
    setActivePanel((current) =>
      match(current)
        .with('sidebar', () => 'editor' as const)
        .with('editor', () => 'sidebar' as const)
        .exhaustive()
    )
  }, [])

  return { activePanel, cyclePanel, setPanel: setActivePanel }
}
