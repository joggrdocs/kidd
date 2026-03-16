import { command } from '@kidd-cli/core'

export default command({
  description: 'Show a single icon by name',
  positionals: [{ name: 'name', type: 'string', description: 'Icon name to look up', required: true }],
  handler: (ctx) => {
    if (!ctx.icons.has(ctx.args.name)) {
      ctx.fail(`Unknown icon: "${ctx.args.name}"`)
    }

    const glyph = ctx.icons.get(ctx.args.name)
    ctx.output.write(`${glyph}  ${ctx.args.name}`)
  },
})
