import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: './dist' },
  commands: './commands',
  compile: true,
  entry: './index.ts',
})
