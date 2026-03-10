import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: './dist' },
  commandOrder: ['deploy', 'status', 'ping', 'whoami'],
  commands: './src/commands',
  entry: './src/index.ts',
})
