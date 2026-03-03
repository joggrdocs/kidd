import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/commands/**/*.ts', '!src/**/*.test.ts'],
  format: 'esm',
  outDir: 'dist',
})
