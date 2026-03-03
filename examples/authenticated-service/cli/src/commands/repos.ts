import { command } from 'kidd'
import { z } from 'zod'

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

export default command({
  args,
  description: 'List repositories for the authenticated user',
  handler: async (ctx) => {
    ctx.spinner.start('Fetching repos...')

    const res = await ctx.api.get<Repo[]>('/repos')

    ctx.spinner.stop(`Found ${String(res.data.length)} repos`)

    if (ctx.args.json) {
      ctx.output.write(res.data, { json: true })
      return
    }

    ctx.output.table(
      res.data.map((repo) => ({
        Name: repo.full_name,
        Private: repo.private ? 'yes' : 'no',
      })),
    )
  },
})
