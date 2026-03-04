import { command } from '@kidd-cli/core'
import { z } from 'zod'

const args = z.object({
  name: z.string().describe('Repository name'),
  private: z.boolean().default(false).describe('Create as private repo'),
})

interface CreateRepoInput {
  readonly name: string
  readonly private: boolean
}

interface Repo {
  readonly id: number
  readonly name: string
  readonly full_name: string
  readonly private: boolean
  readonly owner: string
}

export default command({
  args,
  description: 'Create a new repository',
  handler: async (ctx) => {
    ctx.spinner.start(`Creating repo "${ctx.args.name}"...`)

    const res = await ctx.api.post<Repo, CreateRepoInput>('/repos', {
      body: { name: ctx.args.name, private: ctx.args.private },
    })

    ctx.spinner.stop('Repo created')

    ctx.logger.success(`Created ${res.data.full_name} (id: ${String(res.data.id)})`)
  },
})
