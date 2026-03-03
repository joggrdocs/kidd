import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts',
        '**/test/**',
        '**/templates/**',
      ],
      include: ['packages/*/src/**/*.ts'],
      provider: 'v8',
      reporter: [
        ['text', { skipFull: true }],
        ['json', {}],
        ['html', {}],
      ],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 60,
        statements: 60,
      },
    },
    projects: [
      'packages/bundler',
      'packages/cli',
      'packages/config',
      'packages/kidd',
      'packages/utils',
    ],
  },
})
