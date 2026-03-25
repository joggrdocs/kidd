import { story } from '@kidd-cli/core/stories'
import { z } from 'zod'

import { StatusBadge } from './StatusBadge'

export default story({
  name: 'StatusBadge',
  component: StatusBadge,
  schema: z.object({
    status: z.enum(['done', 'in-progress', 'todo']).describe('Current task status'),
  }),
  props: {
    status: 'done',
  },
  description: 'Colored badge showing task status — use the props editor to switch between states',
})
