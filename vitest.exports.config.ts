import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'packages/core/src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
