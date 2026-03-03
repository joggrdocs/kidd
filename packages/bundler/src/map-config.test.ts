import { describe, expect, it, vi } from 'vitest'

import { NODE_BUILTINS, SHEBANG } from './constants.js'
import { mapToBuildConfig, mapToWatchConfig } from './map-config.js'
import type { ResolvedBundlerConfig } from './types.js'

const config: ResolvedBundlerConfig = {
  build: {
    external: ['pg'],
    minify: false,
    sourcemap: true,
    target: 'node18',
  },
  buildOutDir: '/project/dist',
  commands: '/project/commands',
  compile: {
    name: 'my-cli',
    targets: [],
  },
  compileOutDir: '/project/dist',
  cwd: '/project',
  entry: '/project/src/index.ts',
  include: [],
}

describe('build config mapping', () => {
  const result = mapToBuildConfig(config)

  it('should set entry as object with index key', () => {
    expect(result.entry).toStrictEqual({ index: '/project/src/index.ts' })
  })

  it('should set format to esm', () => {
    expect(result.format).toBe('esm')
  })

  it('should set platform to node', () => {
    expect(result.platform).toBe('node')
  })

  it('should set outDir from resolved config', () => {
    expect(result.outDir).toBe('/project/dist')
  })

  it('should set target from resolved config', () => {
    expect(result.target).toBe('node18')
  })

  it('should set sourcemap from resolved config', () => {
    expect(result.sourcemap).toBeTruthy()
  })

  it('should set minify from resolved config', () => {
    expect(result.minify).toBeFalsy()
  })

  it('should prepend shebang as banner', () => {
    expect(result.banner).toBe(SHEBANG)
  })

  it('should disable config file loading', () => {
    expect(result.config).toBeFalsy()
  })

  it('should enable clean and treeshake', () => {
    expect(result.clean).toBeTruthy()
    expect(result.treeshake).toBeTruthy()
  })

  it('should disable dts', () => {
    expect(result.dts).toBeFalsy()
  })

  it('should set logLevel to info', () => {
    expect(result.logLevel).toBe('info')
  })

  it('should disable code splitting for single-file output', () => {
    const outputOpts = result.outputOptions as { codeSplitting: boolean }
    expect(outputOpts.codeSplitting).toBeFalsy()
  })

  it('should prefer ESM module entry via mainFields', () => {
    const inputOpts = result.inputOptions as { resolve: { mainFields: string[] } }
    expect(inputOpts.resolve.mainFields).toStrictEqual(['module', 'main'])
  })

  it('should set cwd from resolved config', () => {
    expect(result.cwd).toBe('/project')
  })

  it('should combine node builtins with user externals in deps.neverBundle', () => {
    const neverBundle = result.deps as { neverBundle: (string | RegExp)[] }
    expect(neverBundle.neverBundle).toContain('pg')
    expect(neverBundle.neverBundle).toEqual(expect.arrayContaining(NODE_BUILTINS))
  })
})

describe('watch config mapping', () => {
  it('should spread build config and enable watch', () => {
    const result = mapToWatchConfig({ config })
    expect(result.watch).toBeTruthy()
    expect(result.format).toBe('esm')
  })

  it('should pass through onSuccess callback', () => {
    const onSuccess = vi.fn()
    const result = mapToWatchConfig({ config, onSuccess })
    expect(result.onSuccess).toBe(onSuccess)
  })

  it('should leave onSuccess undefined when not provided', () => {
    const result = mapToWatchConfig({ config })
    expect(result.onSuccess).toBeUndefined()
  })
})
