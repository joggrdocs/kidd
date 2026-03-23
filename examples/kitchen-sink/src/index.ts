import { cli } from '@kidd-cli/core'
import { logger } from '@kidd-cli/core/logger'

cli({
  description: 'Kitchen sink demo — handler and render modes',
  help: { header: 'kitchen-sink - TUI demo' },
  middleware: [logger()],
  name: 'kitchen-sink',
  version: '1.0.0',
})
