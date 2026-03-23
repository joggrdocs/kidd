import { cli } from '@kidd-cli/core'
import { report } from '@kidd-cli/core/report'

cli({
  commands: {
    order: ['lint', 'test', 'check'],
    path: `${import.meta.dirname}/commands`,
  },
  description: 'Diagnostic output demo CLI',
  middleware: [report()],
  name: 'dx',
  version: '1.0.0',
})
