import { command } from 'kidd'
import { z } from 'zod'

const args = z.object({
  name: z.string().describe('Name of the person to greet'),
  shout: z.boolean().default(false).describe('Print the greeting in uppercase'),
})

export default command({
  args,
  description: 'Greet someone by name',
  handler: (ctx) => {
    const greeting = `Hello, ${ctx.args.name}!`

    if (ctx.args.shout) {
      ctx.output.write(greeting.toUpperCase())
    } else {
      ctx.output.write(greeting)
    }
  },
})
