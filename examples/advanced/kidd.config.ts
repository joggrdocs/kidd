import { defineConfig } from 'kidd'

export default defineConfig({
  build: { out: './dist' },
  commands: './src/commands',
  entry: './src/index.ts',
})
