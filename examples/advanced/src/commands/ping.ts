import { command } from '@kidd-cli/core'

export default command({
  description: 'Check API connectivity',
  handler: async (ctx) => {
    const s = ctx.log.spinner('Pinging API...')
    try {
      const res = await ctx.api.get('/health')
      s.stop('API reachable')
      process.stdout.write(ctx.format.json(res.data))
    } catch {
      s.stop('API unreachable')
      ctx.fail('Could not connect to the API')
    }
  },
})
