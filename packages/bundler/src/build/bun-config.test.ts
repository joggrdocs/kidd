import { describe, expect, it, vi } from 'vitest'

vi.mock(import('node:module'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createRequire: vi.fn(() => ({
      resolve: vi.fn((id: string) => {
        if (id === '@kidd-cli/utils/tag') {
          return '/resolved/tag/index.js'
        }
        if (id === '@kidd-cli/core') {
          return '/resolved/core/dist/index.js'
        }
        return id
      }),
    })),
  }
})

const { buildRunnerConfig } = await import('./bun-config.js')

function makeResolvedConfig(): Parameters<typeof buildRunnerConfig>[0]['config'] {
  return {
    entry: '/project/src/index.ts',
    commands: '/project/src/commands',
    buildOutDir: '/project/dist',
    compileOutDir: '/project/dist/bin',
    build: {
      target: 'node18',
      minify: true,
      sourcemap: true,
      external: ['pg'],
      clean: true,
    },
    compile: {
      targets: ['darwin-arm64' as const],
      name: 'cli',
    },
    include: [],
    cwd: '/project',
  }
}

describe('buildRunnerConfig', () => {
  it('should return a config with all required fields', () => {
    const result = buildRunnerConfig({
      config: makeResolvedConfig(),
      version: '1.0.0',
      compile: false,
    })

    expect(result.entry).toBe('/project/src/index.ts')
    expect(result.outDir).toBe('/project/dist')
    expect(result.commandsDir).toBe('/project/src/commands')
    expect(result.minify).toBe(true)
    expect(result.sourcemap).toBe(true)
    expect(result.target).toBe('node18')
    expect(result.compile).toBe(false)
    expect(result.external).toEqual(['pg'])
  })

  it('should define __KIDD_VERSION__ when version is provided', () => {
    const result = buildRunnerConfig({
      config: makeResolvedConfig(),
      version: '2.3.4',
      compile: false,
    })

    expect(result.define).toEqual({ __KIDD_VERSION__: '"2.3.4"' })
  })

  it('should return empty define when version is undefined', () => {
    const result = buildRunnerConfig({
      config: makeResolvedConfig(),
      version: undefined,
      compile: false,
    })

    expect(result.define).toEqual({})
  })

  it('should resolve tag module path and core dist dir', () => {
    const result = buildRunnerConfig({
      config: makeResolvedConfig(),
      version: '1.0.0',
      compile: true,
    })

    expect(result.tagModulePath).toBe('/resolved/tag/index.js')
    expect(result.coreDistDir).toBe('/resolved/core/dist')
  })

  it('should convert ALWAYS_BUNDLE regexes to source strings', () => {
    const result = buildRunnerConfig({
      config: makeResolvedConfig(),
      version: '1.0.0',
      compile: false,
    })

    expect(result.alwaysBundlePatterns.length).toBeGreaterThan(0)
    expect(result.alwaysBundlePatterns.every((pattern) => typeof pattern === 'string')).toBe(true)
  })

  it('should include node builtins', () => {
    const result = buildRunnerConfig({
      config: makeResolvedConfig(),
      version: '1.0.0',
      compile: false,
    })

    expect(result.nodeBuiltins.length).toBeGreaterThan(0)
    expect(result.nodeBuiltins).toContain('fs')
    expect(result.nodeBuiltins).toContain('node:fs')
  })

  it('should include stub packages', () => {
    const result = buildRunnerConfig({
      config: makeResolvedConfig(),
      version: '1.0.0',
      compile: false,
    })

    expect(result.stubPackages.length).toBeGreaterThan(0)
    expect(result.stubPackages).toContain('chokidar')
  })
})
