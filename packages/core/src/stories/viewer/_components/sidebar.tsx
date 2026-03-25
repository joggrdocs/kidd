import { hasTag } from '@kidd-cli/utils/tag'
import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { match } from 'ts-pattern'

import { useFullScreen } from '../../../ui/fullscreen.js'
import { ScrollArea } from '../../../ui/scroll-area.js'
import type { Story, StoryEntry, StoryGroup } from '../../types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Number of terminal rows consumed by sidebar chrome (borders, header,
 * margin, status bar) that must be subtracted from terminal height
 * to compute the scrollable area height.
 *
 * @private
 */
const SIDEBAR_CHROME_ROWS = 6

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Sidebar} component.
 */
interface SidebarProps {
  readonly entries: ReadonlyMap<string, StoryEntry>
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
  readonly isFocused: boolean
}

/**
 * A flat item in the sidebar list, representing either a group header
 * or an individual story variant.
 *
 * @private
 */
interface SidebarItem {
  readonly id: string
  readonly label: string
  readonly isGroupHeader: boolean
  readonly indent: number
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Story browser sidebar. Displays story groups and single stories in a
 * navigable list. Arrow keys move the highlight, Enter selects a story.
 *
 * @param props - The sidebar props.
 * @returns A rendered sidebar element.
 */
export function Sidebar({ entries, selectedId, onSelect, isFocused }: SidebarProps): ReactElement {
  const items = useMemo(() => buildSidebarItems(entries), [entries])
  const selectableItems = useMemo(() => items.filter((item) => !item.isGroupHeader), [items])
  const [highlightIndex, setHighlightIndex] = useState(0)

  useEffect(() => {
    setHighlightIndex((current) => {
      if (selectableItems.length === 0) {
        return 0
      }
      if (current >= selectableItems.length) {
        return selectableItems.length - 1
      }
      return current
    })
  }, [selectableItems.length])

  useInput(
    (_input, key) => {
      if (key.upArrow) {
        setHighlightIndex((current) => {
          const next = Math.max(0, current - 1)
          selectByIndex(selectableItems, next, onSelect)
          return next
        })
      }
      if (key.downArrow) {
        setHighlightIndex((current) => {
          const next = Math.min(selectableItems.length - 1, current + 1)
          selectByIndex(selectableItems, next, onSelect)
          return next
        })
      }
      if (key.return) {
        selectByIndex(selectableItems, highlightIndex, onSelect)
      }
    },
    { isActive: isFocused }
  )

  const highlightedItem = selectableItems[highlightIndex]
  const highlightedId = resolveHighlightedId(highlightedItem)
  const { rows } = useFullScreen()
  const scrollHeight = Math.max(1, rows - SIDEBAR_CHROME_ROWS)
  const activeItemIndex = useMemo(
    () => items.findIndex((item) => item.id === highlightedId),
    [items, highlightedId]
  )

  return (
    <Box
      flexDirection="column"
      borderStyle={match(isFocused)
        .with(true, () => 'bold' as const)
        .with(false, () => 'single' as const)
        .exhaustive()}
      width="25%"
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text
          bold
          color={match(isFocused)
            .with(true, () => 'cyan' as const)
            .with(false, () => undefined)
            .exhaustive()}
        >
          Stories
        </Text>
      </Box>
      <ScrollArea
        height={scrollHeight}
        activeIndex={Math.max(0, activeItemIndex)}
        itemCount={items.length}
        showIndicator={items.length > scrollHeight}
      >
        {items.map((item) => (
          <SidebarRow
            key={item.id}
            item={item}
            isHighlighted={item.id === highlightedId}
            isSelected={item.id === selectedId}
          />
        ))}
      </ScrollArea>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Props for the {@link SidebarRow} component.
 *
 * @private
 */
interface SidebarRowProps {
  readonly item: SidebarItem
  readonly isHighlighted: boolean
  readonly isSelected: boolean
}

/**
 * Render a single row in the sidebar list.
 *
 * @private
 * @param props - The sidebar row props.
 * @returns A rendered sidebar row element.
 */
function SidebarRow({ item, isHighlighted, isSelected }: SidebarRowProps): ReactElement {
  const prefix = match({ isGroupHeader: item.isGroupHeader, isHighlighted })
    .with({ isGroupHeader: true }, () => '')
    .with({ isHighlighted: true }, () => '> ')
    .otherwise(() => '  ')

  const padding = '  '.repeat(item.indent)

  if (item.isGroupHeader) {
    return (
      <Box>
        <Text bold dimColor>
          {padding}
          {item.label}
        </Text>
      </Box>
    )
  }

  return (
    <Box>
      <Text
        color={match({ isHighlighted, isSelected })
          .with({ isHighlighted: true }, () => 'cyan' as const)
          .with({ isSelected: true }, () => 'green' as const)
          .otherwise(() => undefined)}
        bold={isHighlighted}
      >
        {padding}
        {prefix}
        {item.label}
      </Text>
    </Box>
  )
}

/**
 * Select a story by its index in the selectable items array.
 *
 * @private
 * @param selectableItems - The array of selectable sidebar items.
 * @param index - The index to select.
 * @param onSelect - The selection callback.
 */
function selectByIndex(
  selectableItems: readonly SidebarItem[],
  index: number,
  onSelect: (id: string) => void
): void {
  const item = selectableItems[index]
  if (item !== undefined) {
    onSelect(item.id)
  }
}

/**
 * Build a flat list of sidebar items from the registry entries map.
 * Story groups expand into a header followed by indented variant items.
 * Single stories appear as top-level items.
 *
 * @private
 * @param entries - The story registry entries.
 * @returns A flat array of sidebar items.
 */
function buildSidebarItems(entries: ReadonlyMap<string, StoryEntry>): readonly SidebarItem[] {
  return [...entries.entries()].flatMap(([key, entry]) =>
    match(hasTag(entry, 'StoryGroup'))
      .with(true, () => entryToGroupItems(key, entry as StoryGroup))
      .with(false, () =>
        match(hasTag(entry, 'Story'))
          .with(true, () => [
            {
              id: key,
              label: (entry as Story).name,
              isGroupHeader: false,
              indent: 0,
            },
          ])
          .with(false, () => [] as readonly SidebarItem[])
          .exhaustive()
      )
      .exhaustive()
  )
}

/**
 * Extract the ID from a sidebar item, returning null when the item is
 * undefined.
 *
 * @private
 * @param item - The sidebar item to resolve.
 * @returns The item ID or null.
 */
function resolveHighlightedId(item: SidebarItem | undefined): string | null {
  if (item === undefined) {
    return null
  }
  return item.id
}

/**
 * Convert a story group entry into sidebar items: a header followed
 * by indented variant items.
 *
 * @private
 * @param key - The group registry key.
 * @param group - The story group entry.
 * @returns An array of sidebar items for the group.
 */
function entryToGroupItems(key: string, group: StoryGroup): readonly SidebarItem[] {
  const header: SidebarItem = {
    id: `group:${key}`,
    label: group.title,
    isGroupHeader: true,
    indent: 0,
  }
  const variants = Object.keys(group.stories).map((variantName) => ({
    id: `${key}::${variantName}`,
    label: variantName,
    isGroupHeader: false,
    indent: 1,
  }))
  return [header, ...variants]
}
