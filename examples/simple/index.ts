import { cli } from '@kidd-cli/core'
import { logger } from '@kidd-cli/core/logger'

cli({
  description: 'A simple task management CLI',
  help: { header: 'tasks - manage your task list' },
  middleware: [logger()],
  name: 'tasks',
  version: '1.0.0',
})
