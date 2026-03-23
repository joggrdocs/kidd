import { cli } from '@kidd-cli/core'
import { icons } from '@kidd-cli/core/icons'
import { logger } from '@kidd-cli/core/logger'

cli({
  description: 'Icons middleware demo CLI',
  help: { header: 'icon-demo - explore Nerd Font and emoji icons' },
  middleware: [logger(), icons({ forceSetup: true })],
  name: 'icon-demo',
  version: '1.0.0',
})
