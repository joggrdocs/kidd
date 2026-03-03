import { TAG } from '@kidd/utils/tag'
import { describe, expect, it, vi } from 'vitest'

vi.mock(import('c12'), () => ({
  loadConfig: vi.fn(),
}))

import { loadConfig as c12LoadConfig } from 'c12'

import { loadConfig } from './loader.js'

describe(loadConfig, () => {
  it('should return a validated and tagged config on success', async () => {
    vi.mocked(c12LoadConfig).mockResolvedValueOnce({
      config: { entry: './src/index.ts' },
      configFile: '/project/kidd.config.ts',
      cwd: '/project',
      layers: [],
    })

    const [error, result] = await loadConfig()

    expect(error).toBeNull()
    if (result) {
      expect(result.config.entry).toBe('./src/index.ts')
      expect(result.config[TAG]).toBe('KiddConfig')
      expect(result.configFile).toBe('/project/kidd.config.ts')
    }
  })

  it('should pass cwd, defaults, and overrides to c12', async () => {
    vi.mocked(c12LoadConfig).mockResolvedValueOnce({
      config: { entry: './main.ts' },
      configFile: undefined,
      cwd: '/custom',
      layers: [],
    })

    await loadConfig({
      cwd: '/custom',
      defaults: { build: { out: './build' } },
      overrides: { entry: './main.ts' },
    })

    expect(c12LoadConfig).toHaveBeenCalledWith({
      cwd: '/custom',
      defaults: { build: { out: './build' } },
      name: 'kidd',
      overrides: { entry: './main.ts' },
    })
  })

  it('should return error when c12 throws', async () => {
    vi.mocked(c12LoadConfig).mockRejectedValueOnce(new Error('file not found'))

    const [error, result] = await loadConfig()

    expect(error).toBeInstanceOf(Error)
    if (error) {
      expect(error.message).toContain('Failed to load kidd config')
      expect(error.message).toContain('file not found')
    }
    expect(result).toBeNull()
  })

  it('should return error when config validation fails', async () => {
    vi.mocked(c12LoadConfig).mockResolvedValueOnce({
      config: { entry: 123 },
      configFile: '/project/kidd.config.ts',
      cwd: '/project',
      layers: [],
    })

    const [error, result] = await loadConfig()

    expect(error).toBeInstanceOf(Error)
    if (error) {
      expect(error.message).toContain('Invalid kidd config')
    }
    expect(result).toBeNull()
  })

  it('should handle configFile being undefined', async () => {
    vi.mocked(c12LoadConfig).mockResolvedValueOnce({
      config: {},
      configFile: undefined,
      cwd: '/project',
      layers: [],
    })

    const [error, result] = await loadConfig()

    expect(error).toBeNull()
    if (result) {
      expect(result.configFile).toBeUndefined()
    }
  })
})
