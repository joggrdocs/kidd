import { command } from '@kidd-cli/core'

export default command({
  description: 'List all icons in a category',
  positionals: [
    {
      name: 'name',
      type: 'string',
      description: 'Icon category to display',
      required: true,
      choices: ['git', 'devops', 'status', 'files'],
    },
  ],
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
