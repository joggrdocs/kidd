import process from 'node:process'

import { hasTag } from '@kidd-cli/utils/tag'
import { Text, useApp } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'

import { discoverStories } from '../discover.js'
import { createStoryImporter } from '../importer.js'
import { schemaToFieldDescriptors } from '../schema.js'
import type { Story, StoryEntry, StoryGroup } from '../types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StoriesOutput} component.
 */
interface StoriesOutputProps {
  readonly story: string
  readonly include?: string
}

/**
 * Output phase state.
 *
 * @private
 */
type OutputState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'error'; readonly message: string }
  | { readonly phase: 'done' }

/**
 * Serializable representation of a single story for LLM consumption.
 *
 * @private
 */
interface SerializedStory {
  readonly name: string
  readonly description: string | undefined
  readonly props: Record<string, unknown>
  readonly fields: readonly SerializedField[]
}

/**
 * Serializable field descriptor for LLM consumption.
 *
 * @private
 */
interface SerializedField {
  readonly name: string
  readonly control: string
  readonly isOptional: boolean
  readonly defaultValue: unknown
  readonly description: string | undefined
  readonly options?: readonly string[]
  readonly zodTypeName: string
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Non-interactive component that discovers stories, finds the matching
 * story by name, serializes it to JSON, writes to stdout, and exits.
 *
 * Designed for piping story metadata to LLMs or other tooling.
 *
 * @param props - The stories output props.
 * @returns A rendered stories output element.
 */
export function StoriesOutput({ story, include }: StoriesOutputProps): ReactElement {
  const [state, setState] = useState<OutputState>({ phase: 'loading' })
  const { exit } = useApp()

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

      const resolved = findStoryByName(result.entries, story)

      if (resolved === null) {
        const available = collectStoryNames(result.entries)
        const suffix = match(available.length > 0)
          .with(true, () => `\nAvailable stories: ${available.join(', ')}`)
          .with(false, () => '')
          .exhaustive()
        setState({ phase: 'error', message: `Story "${story}" not found.${suffix}` })
        return
      }

      const serialized = serializeStory(resolved)
      process.stdout.write(`${JSON.stringify(serialized, null, 2)}\n`)
      setState({ phase: 'done' })
    }

    run().catch((error: unknown) => {
      const message = match(error instanceof Error)
        .with(true, () => (error as Error).message)
        .with(false, () => 'Unknown error during discovery')
        .exhaustive()
      setState({ phase: 'error', message })
    })
  }, [story, include])

  useEffect(() => {
    if (state.phase === 'done' || state.phase === 'error') {
      exit()
    }
  }, [state, exit])

  return match(state)
    .with({ phase: 'loading' }, () => <Text>Discovering stories...</Text>)
    .with({ phase: 'error' }, ({ message }) => <Text color="red">{message}</Text>)
    .with({ phase: 'done' }, () => <Text />)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Find a story by name across all entries, searching both top-level stories
 * and group variants. Matching is case-insensitive.
 *
 * @private
 * @param entries - The discovered story entries.
 * @param name - The story name to search for.
 * @returns The matching story, or null if not found.
 */
function findStoryByName(entries: ReadonlyMap<string, StoryEntry>, name: string): Story | null {
  const normalized = name.toLowerCase()

  const found = [...entries.values()].reduce<Story | null>((result, entry) => {
    if (result !== null) {
      return result
    }

    if (hasTag(entry, 'Story')) {
      const storyEntry = entry as Story
      if (storyEntry.name.toLowerCase() === normalized) {
        return storyEntry
      }
      return null
    }

    if (hasTag(entry, 'StoryGroup')) {
      const group = entry as StoryGroup

      if (group.title.toLowerCase() === normalized) {
        const [firstVariant] = Object.values(group.stories)
        if (firstVariant !== undefined) {
          return firstVariant
        }
        return null
      }

      const variant = Object.entries(group.stories).reduce<Story | null>(
        (variantResult, [variantName, variantStory]) => {
          if (variantResult !== null) {
            return variantResult
          }
          if (variantName.toLowerCase() === normalized) {
            return variantStory
          }
          return null
        },
        null
      )

      return variant
    }

    return null
  }, null)

  return found
}

/**
 * Collect all story names from entries for error messaging.
 *
 * @private
 * @param entries - The discovered story entries.
 * @returns An array of available story names.
 */
function collectStoryNames(entries: ReadonlyMap<string, StoryEntry>): readonly string[] {
  const singleNames = [...entries.values()]
    .filter((entry) => hasTag(entry, 'Story'))
    .map((entry) => (entry as Story).name)

  const groupNames = [...entries.values()]
    .filter((entry) => hasTag(entry, 'StoryGroup'))
    .flatMap((entry) => extractGroupNames(entry as StoryGroup))

  return [...singleNames, ...groupNames]
}

/**
 * Serialize a story into a plain JSON-safe object for stdout output.
 *
 * @private
 * @param story - The story to serialize.
 * @returns A serializable story representation.
 */
function serializeStory(story: Story): SerializedStory {
  const fields = schemaToFieldDescriptors(story.schema)

  return {
    name: story.name,
    description: story.description,
    props: story.props,
    fields: fields.map(serializeField),
  }
}

/**
 * Serialize a field descriptor into a plain JSON-safe object.
 *
 * @private
 * @param field - The field descriptor to serialize.
 * @returns A serializable field representation.
 */
function serializeField(field: {
  readonly name: string
  readonly control: string
  readonly isOptional: boolean
  readonly defaultValue: unknown
  readonly description: string | undefined
  readonly options?: readonly string[]
  readonly zodTypeName: string
}): SerializedField {
  return {
    name: field.name,
    control: field.control,
    isOptional: field.isOptional,
    defaultValue: field.defaultValue,
    description: field.description,
    options: field.options,
    zodTypeName: field.zodTypeName,
  }
}

/**
 * Extract the title and variant names from a story group.
 *
 * @private
 * @param group - The story group to extract names from.
 * @returns An array containing the group title followed by variant names.
 */
function extractGroupNames(group: StoryGroup): readonly string[] {
  return [group.title, ...Object.keys(group.stories)]
}

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
