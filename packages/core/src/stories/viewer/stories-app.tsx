/* oxlint-disable import/max-dependencies -- Root TUI layout requires many component imports */
import { hasTag } from '@kidd-cli/utils/tag'
import { Box, useApp, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { match } from 'ts-pattern'

import { FullScreen } from '../../ui/fullscreen.js'
import type { StoryRegistry } from '../registry.js'
import { schemaToFieldDescriptors } from '../schema.js'
import type { Story, StoryEntry } from '../types.js'
import { validateProps } from '../validate.js'
import { HelpOverlay } from './_components/help-overlay.js'
import { Preview } from './_components/preview.js'
import { PropsEditor } from './_components/props-editor.js'
import { Sidebar } from './_components/sidebar.js'
import { StatusBar } from './_components/status-bar.js'
import { useViewerMode } from './hooks/use-panel-focus.js'
import { useStories } from './hooks/use-stories.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StoriesApp} component.
 */
interface StoriesAppProps {
  readonly registry: StoryRegistry
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Root layout component for the stories viewer TUI. Combines the sidebar,
 * preview, props editor, and status bar into a fullscreen interactive
 * terminal application.
 *
 * Operates in two modes:
 * - **browse** — Sidebar is active, user navigates the story tree.
 * - **edit** — Props editor is active, user edits field values.
 *
 * @param props - The stories app props.
 * @returns A rendered stories app element.
 */
export function StoriesApp({ registry }: StoriesAppProps): ReactElement {
  const entries = useStories(registry)
  const { mode, enterEditMode, exitEditMode } = useViewerMode()
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [currentProps, setCurrentProps] = useState<Record<string, unknown>>({})
  const [showHelp, setShowHelp] = useState(false)
  const { exit } = useApp()

  const selectedStory = useMemo(
    () => resolveStory(entries, selectedStoryId),
    [entries, selectedStoryId]
  )

  const fields = useMemo(() => {
    if (selectedStory === null) {
      return [] as const
    }
    return schemaToFieldDescriptors(selectedStory.schema)
  }, [selectedStory])

  const errors = useMemo(() => {
    if (selectedStory === null) {
      return [] as const
    }
    return validateProps({ schema: selectedStory.schema, props: currentProps })
  }, [selectedStory, currentProps])

  const handleSelect = useCallback(
    (id: string) => {
      const resolved = resolveStory(entries, id)
      setSelectedStoryId(id)
      if (resolved !== null) {
        setCurrentProps({ ...resolved.props })
      }
      enterEditMode()
    },
    [entries, enterEditMode]
  )

  const handlePropsChange = useCallback((name: string, value: unknown) => {
    setCurrentProps((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleResetProps = useCallback(() => {
    if (selectedStory !== null) {
      setCurrentProps({ ...selectedStory.props })
    }
  }, [selectedStory])

  const handleCloseHelp = useCallback(() => {
    setShowHelp(false)
  }, [])

  useInput((input, key) => {
    if (showHelp) {
      return
    }
    if (input === 'q') {
      exit()
    }
    if (key.escape && mode === 'edit') {
      exitEditMode()
    }
    if (input === 'r') {
      handleResetProps()
    }
    if (input === '?') {
      setShowHelp(true)
    }
  })

  if (showHelp) {
    return (
      <FullScreen>
        <HelpOverlay onClose={handleCloseHelp} />
      </FullScreen>
    )
  }

  return (
    <FullScreen>
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="row" flexGrow={1}>
          <Sidebar
            entries={entries}
            selectedId={selectedStoryId}
            onSelect={handleSelect}
            isFocused={mode === 'browse'}
          />
          <Box flexDirection="column" flexGrow={1}>
            <Preview story={selectedStory} currentProps={currentProps} />
            <PropsEditor
              fields={fields}
              values={currentProps}
              errors={errors}
              onChange={handlePropsChange}
              isFocused={mode === 'edit'}
            />
          </Box>
        </Box>
        <StatusBar mode={mode} hasSelection={selectedStoryId !== null} />
      </Box>
    </FullScreen>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve a story from the entries map by its ID. Supports both direct
 * story keys and group variant keys in the format `groupKey::variantName`.
 *
 * @private
 * @param entries - The story registry entries.
 * @param id - The story ID to resolve.
 * @returns The resolved story, or null if not found.
 */
function resolveStory(entries: ReadonlyMap<string, StoryEntry>, id: string | null): Story | null {
  if (id === null) {
    return null
  }

  const separatorIndex = id.indexOf('::')
  if (separatorIndex === -1) {
    const entry = entries.get(id)
    if (entry === undefined) {
      return null
    }
    return match(hasTag(entry, 'Story'))
      .with(true, () => entry as Story)
      .with(false, () => null)
      .exhaustive()
  }

  const groupKey = id.slice(0, separatorIndex)
  const variantName = id.slice(separatorIndex + 2)
  const group = entries.get(groupKey)

  if (group === undefined || !hasTag(group, 'StoryGroup')) {
    return null
  }

  const variant = group.stories[variantName]
  if (variant === undefined) {
    return null
  }
  return variant
}
