import { command } from '@kidd-cli/core'

export default command({
  description: 'Check API connectivity',
  handler: async (ctx) => {
    ctx.spinner.start('Pinging API...')
    try {
      const res = await ctx.api.get('/health')
      ctx.spinner.stop('API reachable')
      ctx.output.write(res.data, { json: true })
    } catch {
      ctx.spinner.stop('API unreachable')
      ctx.fail('Could not connect to the API')
    }
  },
})
