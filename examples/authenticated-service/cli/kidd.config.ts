import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  commandOrder: ['login', 'logout', 'me', 'repos', 'create-repo'],
  commands: './src/commands',
  entry: './src/index.ts',
})
