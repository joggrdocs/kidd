import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: 'src/index.ts',
  },
  fixedExtension: false,
  format: 'esm',
  outDir: 'dist',
})
