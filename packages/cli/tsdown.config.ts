import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  deps: {
    // Bundle @kidd-cli/* packages so the published CLI is self-contained and
    // does not depend on workspace packages being published with correct exports.
    alwaysBundle: [/^@kidd-cli\//],
    // Keep packages with native bindings external — they cannot be inlined.
    neverBundle: ['tsdown', /^@rolldown\//, /^rolldown/],
  },
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  // Glob pattern auto-discovers command files so new commands are built without config changes.
  // Other packages use explicit object notation because they expose a fixed public API.
  entry: ['src/index.ts', 'src/commands/**/*.ts', '!src/**/*.test.ts'],
  format: 'esm',
})
