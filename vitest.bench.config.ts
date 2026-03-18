import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const plugins = []

  if (process.env['CI']) {
    const { default: codspeedPlugin } = await import('@codspeed/vitest-plugin')
    plugins.push(codspeedPlugin())
  }

  return {
    plugins,
    test: {
      benchmark: {
        include: ['tests/bench/**/*.bench.ts'],
      },
    },
  }
})
