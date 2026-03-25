/* oxlint-disable import/max-dependencies -- Root TUI layout requires many component imports */
import { hasTag } from '@kidd-cli/utils/tag'
import { Box, useApp, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { usePanelFocus } from './hooks/use-panel-focus.js'
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
 * @param props - The stories app props.
 * @returns A rendered stories app element.
 */
export function StoriesApp({ registry }: StoriesAppProps): ReactElement {
  const entries = useStories(registry)
  const { activePanel, cyclePanel } = usePanelFocus()
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [currentProps, setCurrentProps] = useState<Record<string, unknown>>({})
  const [showHelp, setShowHelp] = useState(false)
  const { exit } = useApp()

  useEffect(() => {
    if (selectedStoryId !== null) {
      return
    }
    const firstId = resolveFirstSelectableId(entries)
    if (firstId !== null) {
      setSelectedStoryId(firstId)
      const resolved = resolveStory(entries, firstId)
      if (resolved !== null) {
        setCurrentProps({ ...resolved.props })
      }
    }
  }, [entries, selectedStoryId])

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
    },
    [entries]
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
    if (key.tab) {
      cyclePanel()
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
            isFocused={activePanel === 'sidebar'}
          />
          <Box flexDirection="column" flexGrow={1}>
            <Preview story={selectedStory} currentProps={currentProps} />
            <PropsEditor
              fields={fields}
              values={currentProps}
              errors={errors}
              onChange={handlePropsChange}
              isFocused={activePanel === 'editor'}
            />
          </Box>
        </Box>
        <StatusBar activePanel={activePanel} />
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

/**
 * Find the first selectable story ID from the entries map.
 * For single stories, returns the key. For groups, returns the
 * first variant ID in `key::variantName` format.
 *
 * @private
 * @param entries - The story registry entries.
 * @returns The first selectable ID, or null if none exist.
 */
function resolveFirstSelectableId(entries: ReadonlyMap<string, StoryEntry>): string | null {
  const firstEntry = [...entries.entries()][0]
  if (firstEntry === undefined) {
    return null
  }
  const [key, entry] = firstEntry
  if (hasTag(entry, 'Story')) {
    return key
  }
  if (hasTag(entry, 'StoryGroup')) {
    const firstVariant = Object.keys(entry.stories)[0]
    if (firstVariant !== undefined) {
      return `${key}::${firstVariant}`
    }
  }
  return null
}
