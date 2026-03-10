import { command } from '@kidd-cli/core'

export default command({
  description: 'Deploy the application',
  order: ['production', 'preview'],
})
