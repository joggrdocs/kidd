/**
 * Storybook-like TUI component browser for kidd CLI screens.
 *
 * Define stories alongside components, then run `kidd stories` to
 * preview and interactively edit props in the terminal.
 *
 * @module
 */

export { story, stories } from './story.js'

export { withContext, withFullScreen, withLayout } from './decorators.js'
export type { LayoutOptions } from './decorators.js'

export { schemaToFieldDescriptors, resolveControlKind } from './schema.js'
export type { ZodDef } from './schema.js'

export { validateProps } from './validate.js'
export type { FieldError } from './validate.js'

export { discoverStories } from './discover.js'
export type { DiscoverOptions, DiscoverResult, DiscoverError } from './discover.js'

export { createStoryImporter } from './importer.js'
export type { StoryImporter } from './importer.js'

export { createStoryRegistry } from './registry.js'
export type { StoryRegistry } from './registry.js'

export { createStoryWatcher } from './watcher.js'
export type { StoryWatcher, WatcherOptions } from './watcher.js'

export { StoriesApp } from './viewer/stories-app.js'

export { STORY_FILE_SUFFIXES } from './types.js'
export type {
  Decorator,
  FieldControlKind,
  FieldDescriptor,
  Story,
  StoryDef,
  StoryEntry,
  StoryGroup,
  StoriesGroupDef,
  StoryVariantDef,
} from './types.js'
