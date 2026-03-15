import { defineConfig } from 'tsdown'

export default defineConfig({
  alias: { '@': './src' },
  clean: true,
  dts: true,
  entry: {
    index: 'src/index.ts',
    'lib/config': 'src/lib/config/index.ts',
    'lib/logger': 'src/lib/logger.ts',
    'lib/project': 'src/lib/project/index.ts',
    'lib/store': 'src/lib/store/index.ts',
    'middleware/auth': 'src/middleware/auth/index.ts',
    'middleware/http': 'src/middleware/http/index.ts',
    'middleware/icons': 'src/middleware/icons/index.ts',
  },
  fixedExtension: false,
  format: 'esm',
  outDir: 'dist',
})
