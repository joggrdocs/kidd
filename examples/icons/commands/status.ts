import { command } from '@kidd-cli/core'

export default command({
  description: 'Show Nerd Font detection status and all icons',
  handler: (ctx) => {
    if (ctx.icons.installed()) {
      ctx.logger.success('Nerd Fonts detected - showing Nerd Font glyphs')
    } else {
      ctx.logger.warn('Nerd Fonts not detected - showing emoji fallbacks')
    }

    ctx.logger.info('')
    ctx.logger.info('Git icons:')
    const gitIcons = ctx.icons.category('git')
    Object.entries(gitIcons).map(([name, glyph]) =>
      ctx.logger.info(`  ${glyph}  ${name}`)
    )

    ctx.logger.info('')
    ctx.logger.info('Status icons:')
    const statusIcons = ctx.icons.category('status')
    Object.entries(statusIcons).map(([name, glyph]) =>
      ctx.logger.info(`  ${glyph}  ${name}`)
    )

    ctx.logger.info('')
    ctx.logger.info('DevOps icons:')
    const devopsIcons = ctx.icons.category('devops')
    Object.entries(devopsIcons).map(([name, glyph]) =>
      ctx.logger.info(`  ${glyph}  ${name}`)
    )

    ctx.logger.info('')
    ctx.logger.info('File icons:')
    const fileIcons = ctx.icons.category('files')
    Object.entries(fileIcons).map(([name, glyph]) =>
      ctx.logger.info(`  ${glyph}  ${name}`)
    )
  },
})
