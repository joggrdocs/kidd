import { command } from 'kidd'

export default command({
  description: 'Authenticate with the service',
  handler: async (ctx) => {
    const [error] = await ctx.auth.authenticate()

    if (error) {
      ctx.fail(error.message)
    }

    ctx.logger.success('Logged in')
  },
})
