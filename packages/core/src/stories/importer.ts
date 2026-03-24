import { toError } from '@kidd-cli/utils/fp'
import { hasTag } from '@kidd-cli/utils/tag'
import { createJiti } from 'jiti'

import type { StoryEntry } from './types.js'

/**
 * A story importer that can load `.stories.{tsx,ts,jsx,js}` files.
 */
export interface StoryImporter {
  readonly importStory: (filePath: string) => Promise<[Error, null] | [null, StoryEntry]>
}

/**
 * Create a story importer backed by jiti with cache disabled for hot reload.
 *
 * @returns A frozen {@link StoryImporter} instance.
 */
export function createStoryImporter(): StoryImporter {
  const jiti = createJiti(import.meta.url, {
    cache: false,
    interopDefault: true,
    jsx: true,
  })

  return Object.freeze({
    importStory: async (filePath: string): Promise<[Error, null] | [null, StoryEntry]> => {
      try {
        const mod = (await jiti.import(filePath)) as Record<string, unknown>
        const entry = (mod.default ?? mod) as unknown

        if (!isStoryEntry(entry)) {
          return [new Error(`File ${filePath} does not export a valid Story or StoryGroup`), null]
        }

        return [null, entry as StoryEntry]
      } catch (error) {
        return [toError(error), null]
      }
    },
  })
}

// ---------------------------------------------------------------------------

/**
 * Check whether a value is a valid {@link StoryEntry} (tagged as `Story` or `StoryGroup`).
 *
 * @private
 * @param value - The value to check.
 * @returns `true` when `value` carries a `Story` or `StoryGroup` tag.
 */
function isStoryEntry(value: unknown): boolean {
  return hasTag(value, 'Story') || hasTag(value, 'StoryGroup')
}
