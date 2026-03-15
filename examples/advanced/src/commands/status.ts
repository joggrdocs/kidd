import { command } from '@kidd-cli/core'

export default command({
  description: 'Show project status',
  handler: (ctx) => {
    const status = {
      cli: {
        name: ctx.meta.name,
        version: ctx.meta.version,
      },
      config: {
        apiUrl: ctx.config.apiUrl,
        environment: ctx.config.defaultEnvironment,
        org: ctx.config.org,
      },
    }

    process.stdout.write(ctx.format.json(status))
  },
})
