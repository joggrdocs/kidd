import { command } from '@kidd-cli/core'
import { z } from 'zod'

const options = z.object({
  name: z.string().describe('Name of the person to greet'),
  shout: z.boolean().default(false).describe('Print the greeting in uppercase'),
})

export default command({
  args: options,
  description: 'Greet someone by name',
  positionals: [
    { name: 'name', type: 'string', description: 'Name of the person to greet', required: true },
  ],
  handler: (ctx) => {
    const greeting = `Hello, ${ctx.args.name}!`

    if (ctx.args.shout) {
      ctx.logger.print(greeting.toUpperCase())
    } else {
      ctx.logger.print(greeting)
    }
  },
})
