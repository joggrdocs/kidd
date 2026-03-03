import { command } from 'kidd'
import type { Command } from 'kidd'

const addCommand: Command = command({
  description: 'Add a command or middleware to your project',
})

export default addCommand
