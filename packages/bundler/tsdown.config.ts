import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  entry: {
    'bun-runner': 'src/build/bun-runner.ts',
    index: 'src/index.ts',
  },
  format: 'esm',
})
