import { defineConfig } from 'tsdown'

import { baseOptions } from '../../tsdown.base.mjs'

export default defineConfig({
  ...baseOptions,
  entry: {
    fp: 'src/fp/index.ts',
    fs: 'src/fs.ts',
    index: 'src/index.ts',
    json: 'src/json.ts',
    manifest: 'src/manifest.ts',
    redact: 'src/redact.ts',
    tag: 'src/tag.ts',
    validate: 'src/validate.ts',
  },
  format: 'esm',
})
