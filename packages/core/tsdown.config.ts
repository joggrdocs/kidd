import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  entry: {
    index: 'src/index.ts',
    'lib/config': 'src/lib/config/index.ts',
    'lib/format': 'src/lib/format/index.ts',
    'lib/project': 'src/lib/project/index.ts',
    'lib/store': 'src/lib/store/index.ts',
    'middleware/auth': 'src/middleware/auth/index.ts',
    'middleware/http': 'src/middleware/http/index.ts',
    'middleware/icons': 'src/middleware/icons/index.ts',
    'middleware/logger': 'src/middleware/logger/index.ts',
    'middleware/report': 'src/middleware/report/index.ts',
    'test/index': 'src/test/index.ts',
  },
  format: 'esm',
})
