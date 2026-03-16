import { command } from '@kidd-cli/core'
import { z } from 'zod'

const options = z.object({
  clean: z.boolean().default(false).describe('Clean build before deploying'),
})

export default command({
  options,
  description: 'Deploy a preview environment',
  positionals: [
    { name: 'branch', type: 'string', description: 'Branch to deploy', default: 'main' },
  ],
  handler: async (ctx) => {
    ctx.spinner.start(`Deploying preview from ${ctx.args.branch}`)

    if (ctx.args.clean) {
      ctx.spinner.message('Running clean build')
    }

    ctx.spinner.message('Uploading artifacts')
    ctx.spinner.message('Provisioning environment')

    const deployUrl = `https://preview-${ctx.args.branch}.${ctx.config.org}.acme.dev`

    ctx.spinner.stop('Preview deployed')

    process.stdout.write(
      ctx.format.json({
        branch: ctx.args.branch,
        environment: 'preview',
        org: ctx.config.org,
        url: deployUrl,
      })
    )
  },
})
