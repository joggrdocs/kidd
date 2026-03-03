import { defineConfig } from 'kidd'

export default defineConfig({
  build: { out: './dist' },
  commands: './commands',
  entry: './index.ts',
})
