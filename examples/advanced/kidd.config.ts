import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: './dist' },
  commands: './src/commands',
  entry: './src/index.ts',
})
