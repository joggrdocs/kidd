import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: 'src/index.ts',
    loader: 'src/loader.ts',
  },
  fixedExtension: false,
  format: 'esm',
  outDir: 'dist',
})
