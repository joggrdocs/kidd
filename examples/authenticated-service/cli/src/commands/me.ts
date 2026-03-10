import { command } from '@kidd-cli/core'
import { z } from 'zod'

import requireAuth from '../middleware/require-auth.js'

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
  description: '[auth] Display the authenticated user',
  middleware: [requireAuth],
  handler: async (ctx) => {
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
