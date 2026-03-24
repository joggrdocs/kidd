import process from 'node:process'

import { Text } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'

import { discoverStories } from '../discover.js'
import { createStoryImporter } from '../importer.js'
import { createStoryRegistry } from '../registry.js'
import type { StoryEntry } from '../types.js'
import { createStoryWatcher } from '../watcher.js'
import { StoriesApp } from './stories-app.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StoriesScreen} component.
 */
interface StoriesScreenProps {
  readonly include?: string
}

/**
 * Discovery phase state.
 *
 * @private
 */
type DiscoveryState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'empty'; readonly warningCount: number }
  | { readonly phase: 'ready' }

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Screen-compatible wrapper that discovers stories on mount, sets up
 * the file watcher, and renders the {@link StoriesApp} when ready.
 *
 * Designed to be used with `screen()` so the framework manages
 * stdin/raw mode and the Ink rendering lifecycle.
 *
 * @param props - The stories screen props.
 * @returns A rendered stories screen element.
 */
export function StoriesScreen({ include }: StoriesScreenProps): ReactElement {
  const [state, setState] = useState<DiscoveryState>({ phase: 'loading' })
  const [registry] = useState(createStoryRegistry)

  useEffect(() => {
    const importer = createStoryImporter()
    const cwd = process.cwd()
    const includePatterns = buildIncludePatterns(include)

    const run = async (): Promise<void> => {
      const result = await discoverStories({
        cwd,
        importer,
        include: includePatterns,
      })

      const storyCount = [...result.entries].reduce(
        (count, [name, entry]: [string, StoryEntry]) => {
          registry.set(name, entry)
          return count + 1
        },
        0
      )

      if (storyCount === 0) {
        setState({ phase: 'empty', warningCount: result.errors.length })
        return
      }

      setState({ phase: 'ready' })
    }

    run().catch(() => {
      setState({ phase: 'empty', warningCount: 0 })
    })

    const watcher = createStoryWatcher({
      directories: [cwd],
      importer,
      registry,
    })

    return () => {
      watcher.close()
    }
  }, [include, registry])

  return match(state)
    .with({ phase: 'loading' }, () => <Text>Discovering stories...</Text>)
    .with({ phase: 'empty' }, ({ warningCount }) => (
      <Text>
        No stories found ({warningCount} warnings). Create a .stories.tsx file in your src/
        directory to get started.
      </Text>
    ))
    .with({ phase: 'ready' }, () => <StoriesApp registry={registry} />)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build include patterns from the optional CLI flag.
 *
 * @private
 * @param include - Optional single glob pattern from CLI.
 * @returns Array of include patterns, or undefined for defaults.
 */
function buildIncludePatterns(include: string | undefined): readonly string[] | undefined {
  if (include === undefined) {
    return undefined
  }
  return [include]
}
