import { defineConfig } from 'tsdown'

import { baseOptions } from '../../tsdown.base.mjs'

export default defineConfig({
  ...baseOptions,
  // Glob pattern auto-discovers command files so new commands are built without config changes.
  // Other packages use explicit object notation because they expose a fixed public API.
  entry: ['src/index.ts', 'src/commands/**/*.ts', '!src/**/*.test.ts'],
  format: 'esm',
})
