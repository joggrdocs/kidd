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
      'packages/core',
      'packages/utils',
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: 30_000,
        },
      },
      {
        test: {
          name: 'exports',
          include: ['tests/exports.test.ts'],
        },
      },
    ],
  },
})
