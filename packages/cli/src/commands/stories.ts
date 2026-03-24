import process from 'node:process'

import { command } from '@kidd-cli/core'
import type { Command, CommandContext } from '@kidd-cli/core'
import {
  createStoryImporter,
  createStoryRegistry,
  createStoryWatcher,
  discoverStories,
  StoriesApp,
} from '@kidd-cli/core/stories'
import type { DiscoverError, StoryEntry } from '@kidd-cli/core/stories'
import { z } from 'zod'

/**
 * Options schema for the `kidd stories` command.
 */
const options = z.object({
  include: z.string().describe('Glob pattern for story files').optional(),
})

/**
 * Launch the stories viewer TUI for browsing and editing
 * component stories in the terminal.
 */
const storiesCommand: Command = command({
  description: 'Browse and preview component stories in the terminal',
  options,
  handler: async (ctx: CommandContext<{ readonly include?: string }>) => {
    const cwd = process.cwd()
    const importer = createStoryImporter()
    const registry = createStoryRegistry()

    const includePatterns = buildIncludePatterns(ctx.args.include)

    ctx.spinner.start('Discovering stories...')

    const result = await discoverStories({
      cwd,
      importer,
      include: includePatterns,
    })

    const storyCount = [...result.entries].reduce((count, [name, entry]: [string, StoryEntry]) => {
      registry.set(name, entry)
      return count + 1
    }, 0)

    const warningCount = result.errors.reduce((count, error: DiscoverError) => {
      ctx.log.warn(`Failed to load ${error.filePath}: ${error.message}`)
      return count + 1
    }, 0)

    if (storyCount === 0) {
      ctx.spinner.stop(`No stories found (${warningCount} warnings)`)
      ctx.log.info(
        'Create a .stories.tsx or .stories.jsx file in your src/ directory to get started.'
      )
      return
    }

    ctx.spinner.stop(`Found ${storyCount} stories`)

    const watcher = createStoryWatcher({
      directories: [cwd],
      importer,
      registry,
    })

    const { render: inkRender } = await import('ink')
    const React = await import('react')

    const instance = inkRender(React.createElement(StoriesApp, { registry }))

    try {
      await instance.waitUntilExit()
    } finally {
      watcher.close()
      process.stdout.write('\u001B[?1049l')
    }
  },
})

export default storiesCommand

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
