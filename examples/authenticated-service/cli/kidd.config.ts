import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  commands: './src/commands',
  compile: true,
  entry: './src/index.ts',
})
