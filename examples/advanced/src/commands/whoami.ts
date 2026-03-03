import { command } from 'kidd'
import { z } from 'zod'

const args = z.object({
  json: z.boolean().default(false).describe('Output as JSON'),
})

export default command({
  args,
  description: 'Display the current user',
  handler: (ctx) => {
    ctx.output.write({ user: 'todo' }, { json: ctx.args.json })
  },
})
