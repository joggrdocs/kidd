import { withTag } from '@kidd-cli/utils/tag'

import type { Story, StoryEntry } from '../types.js'

/**
 * Create a mock story entry for testing.
 *
 * @param name - The story name.
 * @returns A frozen, tagged {@link StoryEntry}.
 */
export function createMockStory(name: string): StoryEntry {
  return Object.freeze(
    withTag(
      {
        name,
        component: () => null,
        schema: {} as Story['schema'],
        props: {},
        decorators: Object.freeze([]),
        description: undefined,
      },
      'Story'
    )
  ) as StoryEntry
}
