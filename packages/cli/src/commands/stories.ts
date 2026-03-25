import type { Command } from '@kidd-cli/core'
import { StoriesScreen } from '@kidd-cli/core/stories'
import { screen } from '@kidd-cli/core/ui'
import { z } from 'zod'

/**
 * Options schema for the `kidd stories` command.
 */
const options = z.object({
  include: z.string().describe('Glob pattern for story files').optional(),
  out: z.string().describe('Render story to stdout (pass story name, or omit for all)').optional(),
})

/**
 * Launch the stories viewer TUI for browsing and editing
 * component stories in the terminal.
 */
const storiesCommand: Command = screen({
  description: 'Browse and preview component stories in the terminal',
  options,
  exit: 'manual',
  render: StoriesScreen,
})

export default storiesCommand
