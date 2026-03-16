import { command } from '@kidd-cli/core'
import { z } from 'zod'

const args = z.object({
  shout: z.boolean().default(false).describe('Print the greeting in uppercase'),
})

export default command({
  args,
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
