import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    fp: 'src/fp/index.ts',
    index: 'src/index.ts',
    json: 'src/json.ts',
    manifest: 'src/manifest.ts',
    redact: 'src/redact.ts',
    tag: 'src/tag.ts',
    validate: 'src/validate.ts',
  },
  fixedExtension: false,
  format: 'esm',
  outDir: 'dist',
})
