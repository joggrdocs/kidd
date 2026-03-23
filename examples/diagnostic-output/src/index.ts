import { cli } from '@kidd-cli/core'
import { logger } from '@kidd-cli/core/logger'
import { report } from '@kidd-cli/core/report'

cli({
  commands: {
    order: ['lint', 'test', 'check'],
    path: `${import.meta.dirname}/commands`,
  },
  description: 'Diagnostic output demo CLI',
  middleware: [logger(), report()],
  name: 'dx',
  version: '1.0.0',
})
