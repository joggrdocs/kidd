import { command } from '@kidd-cli/core'
import { z } from 'zod'

const options = z.object({
  force: z.boolean().default(false).describe('Skip confirmation prompt'),
  tag: z.string().describe('Release tag to deploy (e.g. v1.2.3)'),
})

export default command({
  options,
  description: 'Deploy to production',
  handler: async (ctx) => {
    if (!ctx.args.force) {
      const confirmed = await ctx.log.confirm({
        message: `Deploy ${ctx.args.tag} to production for ${ctx.config.org}?`,
      })

      if (!confirmed) {
        ctx.fail('Deployment cancelled')
      }
    }

    const s = ctx.log.spinner(`Deploying ${ctx.args.tag} to production`)
    s.message('Running pre-deploy checks')
    s.message('Building release artifacts')
    s.message('Rolling out to production')
    s.stop(`Deployed ${ctx.args.tag} to production`)

    process.stdout.write(
      ctx.format.json({
        environment: 'production',
        org: ctx.config.org,
        tag: ctx.args.tag,
        url: `https://${ctx.config.org}.acme.dev`,
      })
    )
  },
})
