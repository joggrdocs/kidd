import { command } from '@kidd-cli/core'
import { match } from 'ts-pattern'
import { z } from 'zod'

const options = z.object({
  json: z.boolean().default(false).describe('Output as JSON'),
})

export default command({
  args: options,
  description: 'Display the current user',
  handler: (ctx) => {
    match(ctx.args.json)
      .with(true, () => {
        process.stdout.write(ctx.format.json({ user: 'todo' }))
      })
      .with(false, () => {
        ctx.logger.info('User: todo')
      })
      .exhaustive()
  },
})
