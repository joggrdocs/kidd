import { command } from '@kidd-cli/core'
import { z } from 'zod'

const args = z.object({
  force: z.boolean().default(false).describe('Skip confirmation prompt'),
  tag: z.string().describe('Release tag to deploy (e.g. v1.2.3)'),
})

export default command({
  args,
  description: 'Deploy to production',
  handler: async (ctx) => {
    if (!ctx.args.force) {
      const confirmed = await ctx.prompts.confirm({
        message: `Deploy ${ctx.args.tag} to production for ${ctx.config.org}?`,
      })

      if (!confirmed) {
        ctx.fail('Deployment cancelled')
      }
    }

    ctx.spinner.start(`Deploying ${ctx.args.tag} to production`)
    ctx.spinner.message('Running pre-deploy checks')
    ctx.spinner.message('Building release artifacts')
    ctx.spinner.message('Rolling out to production')
    ctx.spinner.stop(`Deployed ${ctx.args.tag} to production`)

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
