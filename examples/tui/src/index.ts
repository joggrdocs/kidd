import { cli } from '@kidd-cli/core'
import { report } from '@kidd-cli/core/report'

cli({
  description: 'TUI demo — handler and screen modes with fullscreen support',
  help: { header: 'tui - fullscreen TUI demo' },
  middleware: [report()],
  name: 'tui',
  version: '1.0.0',
})
