import { defineConfig } from 'tsdown'

import { baseOptions } from '../../tsdown.base.mjs'

export default defineConfig({
  ...baseOptions,
  entry: {
    index: 'src/index.ts',
  },
  format: 'esm',
})
