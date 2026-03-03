import { command } from 'kidd'
import { z } from 'zod'

const args = z.object({
  branch: z.string().default('main').describe('Branch to deploy'),
  clean: z.boolean().default(false).describe('Clean build before deploying'),
})

export default command({
  args,
  description: 'Deploy a preview environment',
  handler: async (ctx) => {
    ctx.spinner.start(`Deploying preview from ${ctx.args.branch}`)

    if (ctx.args.clean) {
      ctx.spinner.message('Running clean build')
    }

    ctx.spinner.message('Uploading artifacts')
    ctx.spinner.message('Provisioning environment')

    const deployUrl = `https://preview-${ctx.args.branch}.${ctx.config.org}.acme.dev`

    ctx.spinner.stop('Preview deployed')

    ctx.output.write(
      {
        branch: ctx.args.branch,
        environment: 'preview',
        org: ctx.config.org,
        url: deployUrl,
      },
      { json: true }
    )
  },
})
