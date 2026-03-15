import { command } from '@kidd-cli/core'
import { z } from 'zod'

const args = z.object({
  name: z.string().describe('Icon name to look up'),
})

export default command({
  args,
  description: 'Show a single icon by name',
  handler: (ctx) => {
    if (!ctx.icons.has(ctx.args.name)) {
      ctx.fail(`Unknown icon: "${ctx.args.name}"`)
    }

    const glyph = ctx.icons.get(ctx.args.name)
    ctx.output.write(`${glyph}  ${ctx.args.name}`)
  },
})
