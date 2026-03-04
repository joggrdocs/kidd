import { command } from '@kidd-cli/core'
import { z } from 'zod'

const args = z.object({
  json: z.boolean().default(false).describe('Output as JSON'),
})

interface User {
  readonly login: string
  readonly id: number
  readonly name: string
  readonly email: string
}

export default command({
  args,
  description: 'Display the authenticated user',
  handler: async (ctx) => {
    if (!ctx.auth.authenticated()) {
      return ctx.fail('Not authenticated. Run `demo login` first.')
    }

    ctx.spinner.start('Fetching user...')

    const res = await ctx.api.get<User>('/user')

    ctx.spinner.stop('User fetched')

    if (ctx.args.json) {
      ctx.output.write(res.data, { json: true })
      return
    }

    ctx.logger.info(`Login: ${res.data.login}`)
    ctx.logger.info(`Name:  ${res.data.name}`)
    ctx.logger.info(`Email: ${res.data.email}`)
  },
})
