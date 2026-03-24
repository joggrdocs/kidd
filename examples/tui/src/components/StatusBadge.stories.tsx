import { stories } from '@kidd-cli/core/stories'
import { z } from 'zod'

import { StatusBadge } from './StatusBadge.js'

const schema = z.object({
  status: z.enum(['done', 'in-progress', 'todo']).describe('Current task status'),
})

export default stories({
  title: 'StatusBadge',
  component: StatusBadge,
  schema,
  stories: {
    Done: {
      props: { status: 'done' },
      description: 'Completed task state',
    },
    InProgress: {
      props: { status: 'in-progress' },
      description: 'Work in progress',
    },
    Todo: {
      props: { status: 'todo' },
      description: 'Not yet started',
    },
  },
})
