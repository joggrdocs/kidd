import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  entry: {
    index: 'src/index.ts',
    utils: 'src/utils/index.ts',
  },
  format: 'esm',
})
