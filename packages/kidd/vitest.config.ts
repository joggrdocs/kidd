import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@test': resolve(__dirname, 'test'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
