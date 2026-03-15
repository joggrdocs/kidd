import { command } from '@kidd-cli/core'
import { z } from 'zod'

import requireAuth from '../middleware/require-auth.js'

const args = z.object({
  json: z.boolean().default(false).describe('Output as JSON'),
})

interface Repo {
  readonly id: number
  readonly name: string
  readonly full_name: string
  readonly private: boolean
  readonly owner: string
}

/** @private */
function formatPrivate(isPrivate: boolean): string {
  if (isPrivate) {
    return 'yes'
  }

  return 'no'
}

export default command({
  args,
  description: '[auth] List repositories for the authenticated user',
  middleware: [requireAuth],
  handler: async (ctx) => {
    ctx.spinner.start('Fetching repos...')

    const res = await ctx.api.get<Repo[]>('/repos')

    ctx.spinner.stop(`Found ${String(res.data.length)} repos`)

    if (ctx.args.json) {
      process.stdout.write(ctx.format.json(res.data))
      return
    }

    process.stdout.write(
      ctx.format.table(
        res.data.map((repo) => ({
          Name: repo.full_name,
          Private: formatPrivate(repo.private),
        }))
      )
    )
  },
})
