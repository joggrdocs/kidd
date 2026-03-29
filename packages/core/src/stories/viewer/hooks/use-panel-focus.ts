import { useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The current interaction mode in the stories viewer.
 *
 * - `browse` — Sidebar is active, user navigates the story tree.
 * - `edit` — Props editor is active, user edits field values.
 * - `interactive` — Story component has full terminal control.
 */
export type ViewerMode = 'browse' | 'edit' | 'interactive'

/**
 * State and controls for managing the viewer interaction mode.
 */
export interface ViewerModeState {
  readonly mode: ViewerMode
  readonly enterEditMode: () => void
  readonly exitEditMode: () => void
  readonly enterInteractiveMode: () => void
  readonly exitInteractiveMode: () => void
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Manage the interaction mode between browsing stories and editing props.
 * The viewer starts in browse mode. Entering edit mode is only possible
 * when a story has been selected. Exiting edit mode returns to browse.
 *
 * @returns The current viewer mode state and control functions.
 */
export function useViewerMode(): ViewerModeState {
  const [mode, setMode] = useState<ViewerMode>('browse')

  const enterEditMode = useCallback(() => {
    setMode('edit')
  }, [])

  const exitEditMode = useCallback(() => {
    setMode('browse')
  }, [])

  const enterInteractiveMode = useCallback(() => {
    setMode('interactive')
  }, [])

  const exitInteractiveMode = useCallback(() => {
    setMode('browse')
  }, [])

  return { mode, enterEditMode, exitEditMode, enterInteractiveMode, exitInteractiveMode }
}
