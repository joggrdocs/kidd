import { command } from '@kidd-cli/core'

export default command({
  description: 'Initialize a new project interactively',
  handler: async (ctx) => {
    const name = await ctx.log.text({
      message: 'Project name',
      placeholder: 'my-project',
    })

    const template = await ctx.log.select({
      message: 'Template',
      options: [
        { hint: 'bare bones setup', label: 'Minimal', value: 'minimal' },
        { hint: 'common defaults', label: 'Standard', value: 'standard' },
        { hint: 'all features enabled', label: 'Full', value: 'full' },
      ],
    })

    const features = await ctx.log.multiselect({
      message: 'Features',
      options: [
        { label: 'Authentication', value: 'auth' },
        { label: 'Database', value: 'db' },
        { label: 'CI/CD', value: 'ci' },
      ],
    })

    const confirmed = await ctx.log.confirm({
      message: `Create "${name}" with ${template} template?`,
    })

    if (!confirmed) {
      ctx.fail('Project creation cancelled')
    }

    const s = ctx.log.spinner(`Scaffolding ${name}`)

    ctx.log.info(`Template: ${template}`)
    ctx.log.info(`Features: ${features.join(', ')}`)

    s.stop(`Created ${name}`)
  },
})
