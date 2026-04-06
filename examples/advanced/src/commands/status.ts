import { command } from '@kidd-cli/core'

export default command({
  description: 'Show project status',
  handler: async (ctx) => {
    const [error, result] = await ctx.config.load()
    if (error) {
      ctx.fail(error.message)
      return
    }

    const status = {
      cli: {
        name: ctx.meta.name,
        version: ctx.meta.version,
      },
      config: {
        apiUrl: result.config.apiUrl,
        environment: result.config.defaultEnvironment,
        org: result.config.org,
      },
    }

    process.stdout.write(ctx.format.json(status))
  },
})
