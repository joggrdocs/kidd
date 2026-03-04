import { command } from '@kidd-cli/core'
import type { Command } from '@kidd-cli/core'

const addCommand: Command = command({
  description: 'Add a command or middleware to your project',
})

export default addCommand
