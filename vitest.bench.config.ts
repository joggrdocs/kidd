import { defineConfig } from 'vitest/config'

/**
 * Load CodSpeed plugin when running in CI.
 *
 * @private
 * @returns An array with the CodSpeed plugin, or empty if not in CI.
 */
async function loadPlugins(): Promise<readonly unknown[]> {
  if (!process.env['CI']) {
    return []
  }

  const mod = await import('@codspeed/vitest-plugin')

  return [mod.default()]
}

export default defineConfig(async () => {
  const plugins = await loadPlugins()

  return {
    plugins,
    test: {
      benchmark: {
        include: ['tests/bench/**/*.bench.ts'],
      },
    },
  }
})
