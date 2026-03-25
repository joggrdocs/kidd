import { stories } from '@kidd-cli/core/stories'
import { z } from 'zod'

import { LogLevel } from './LogLevel'

const schema = z.object({
  level: z.enum(['info', 'warn', 'error']).describe('Log severity level'),
})

export default stories({
  title: 'LogLevel',
  component: LogLevel,
  schema,
  stories: {
    Info: {
      props: { level: 'info' },
      description: 'Informational message',
    },
    Warning: {
      props: { level: 'warn' },
      description: 'Warning message',
    },
    Error: {
      props: { level: 'error' },
      description: 'Error message',
    },
  },
})
