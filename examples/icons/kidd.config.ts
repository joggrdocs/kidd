import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: './dist' },
  commands: './commands',
  entry: './index.ts',
})
