import { command } from '@kidd-cli/core'
import { z } from 'zod'

const args = z.object({
  name: z.enum(['git', 'devops', 'status', 'files']).describe('Icon category to display'),
})

export default command({
  args,
  description: 'List all icons in a category',
  handler: (ctx) => {
    const resolved = ctx.icons.category(ctx.args.name)

    ctx.output.table(
      Object.entries(resolved).map(([name, glyph]) => ({
        Glyph: glyph,
        Name: name,
      }))
    )
  },
})
