import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/bundler',
      'packages/cli',
      'packages/config',
      'packages/kidd',
      'packages/utils',
    ],
  },
})
