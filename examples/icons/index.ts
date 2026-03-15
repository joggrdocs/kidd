import { cli } from '@kidd-cli/core'
import { icons } from '@kidd-cli/core/icons'

cli({
  description: 'Icons middleware demo CLI',
  help: { header: 'icon-demo - explore Nerd Font and emoji icons' },
  middleware: [icons({ forceSetup: true })],
  name: 'icon-demo',
  version: '1.0.0',
})
