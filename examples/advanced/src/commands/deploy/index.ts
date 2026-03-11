import { command } from '@kidd-cli/core'

export default command({
  commands: {
    order: ['production', 'preview'],
  },
  description: 'Deploy the application',
})
