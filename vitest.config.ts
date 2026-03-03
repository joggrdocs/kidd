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
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts',
        '**/test/**',
        '**/templates/**',
      ],
      reporter: [
        ['text', { skipFull: true }],
        ['json', {}],
        ['html', {}],
      ],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
})
