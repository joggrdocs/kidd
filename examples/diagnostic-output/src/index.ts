import { cli } from '@kidd-cli/core'

cli({
  commands: {
    order: ['lint', 'test', 'check'],
    path: `${import.meta.dirname}/commands`,
  },
  description: 'Diagnostic output demo CLI',
  name: 'dx',
  version: '1.0.0',
})
