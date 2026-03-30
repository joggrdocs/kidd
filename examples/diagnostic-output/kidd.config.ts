import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: './dist' },
  commands: './src/commands',
  compile: true,
  entry: './src/index.ts',
})
