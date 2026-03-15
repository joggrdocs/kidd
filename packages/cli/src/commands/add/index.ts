import { command } from '@kidd-cli/core'
import type { Command } from '@kidd-cli/core'

const addCommand: Command = command({
  description: 'Add a command, middleware, or config to your project',
})

export default addCommand
