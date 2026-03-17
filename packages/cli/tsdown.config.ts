import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  // Glob pattern auto-discovers command files so new commands are built without config changes.
  // Other packages use explicit object notation because they expose a fixed public API.
  entry: ['src/index.ts', 'src/commands/**/*.ts', '!src/**/*.test.ts'],
  format: 'esm',
})
