import { command } from '@kidd-cli/core'

export default command({
  description: 'Interactively install Nerd Fonts',
  handler: async (ctx) => {
    if (ctx.icons.installed()) {
      ctx.logger.success('Nerd Fonts are already installed')
      return
    }

    ctx.logger.info('Nerd Fonts are not installed on this system')
    const [error, installed] = await ctx.icons.setup()

    if (error) {
      ctx.fail(error.message)
    }

    if (installed) {
      ctx.logger.success('Nerd Fonts installed successfully')
    } else {
      ctx.logger.info('Installation skipped')
    }
  },
})
