import { defineConfig } from 'tsdown'

import { baseOptions } from '../../tsdown.base.mjs'

export default defineConfig({
  ...baseOptions,
  entry: {
    index: 'src/index.ts',
    'lib/config': 'src/lib/config/index.ts',
    'lib/format': 'src/lib/format/index.ts',
    'lib/logger': 'src/lib/logger.ts',
    'lib/project': 'src/lib/project/index.ts',
    'lib/store': 'src/lib/store/index.ts',
    'middleware/auth': 'src/middleware/auth/index.ts',
    'middleware/http': 'src/middleware/http/index.ts',
    'middleware/icons': 'src/middleware/icons/index.ts',
    'test/index': 'src/test/index.ts',
  },
  format: 'esm',
})
