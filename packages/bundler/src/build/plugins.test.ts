import { describe, expect, it, vi } from 'vitest'

import { createExternalsPlugin, createStubPlugin } from './plugins.js'

type ResolveCall = { readonly filter: RegExp; readonly fn: Function }
type LoadCall = { readonly filter: RegExp; readonly namespace: string | undefined; readonly fn: Function }

function createMockBuild(): {
  readonly mockBuild: Record<string, unknown>
  readonly onResolveCalls: ResolveCall[]
  readonly onLoadCalls: LoadCall[]
} {
  const onResolveCalls: ResolveCall[] = []
  const onLoadCalls: LoadCall[] = []
  const mockBuild = {
    onResolve: vi.fn((opts: { filter: RegExp }, fn: Function) => {
      onResolveCalls.push({ filter: opts.filter, fn })
    }),
    onLoad: vi.fn(
      (opts: { filter: RegExp; namespace?: string }, fn: Function) => {
        onLoadCalls.push({ filter: opts.filter, namespace: opts.namespace, fn })
      },
    ),
  }

  return { mockBuild, onResolveCalls, onLoadCalls }
}

describe('createExternalsPlugin', () => {
  const defaultParams = {
    compile: false,
    external: ['pg', 'better-sqlite3'],
    alwaysBundlePatterns: ['^@?kidd'],
    nodeBuiltins: ['fs', 'node:fs', 'path', 'node:path'],
  } as const

  it('should return a BunPlugin with name kidd-externals', () => {
    const plugin = createExternalsPlugin(defaultParams)

    expect(plugin.name).toBe('kidd-externals')
    expect(plugin.setup).toBeTypeOf('function')
  })

  it('should pass through relative paths starting with dot', () => {
    const plugin = createExternalsPlugin(defaultParams)
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn
    const result = resolve({ path: './utils/helper.js' })

    expect(result).toBeUndefined()
  })

  it('should pass through absolute paths starting with slash', () => {
    const plugin = createExternalsPlugin(defaultParams)
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn
    const result = resolve({ path: '/home/user/project/index.ts' })

    expect(result).toBeUndefined()
  })

  it('should mark Node builtins as external', () => {
    const plugin = createExternalsPlugin(defaultParams)
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn

    expect(resolve({ path: 'fs' })).toStrictEqual({ external: true, path: 'fs' })
    expect(resolve({ path: 'node:path' })).toStrictEqual({ external: true, path: 'node:path' })
  })

  it('should mark user externals as external', () => {
    const plugin = createExternalsPlugin(defaultParams)
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn

    expect(resolve({ path: 'pg' })).toStrictEqual({ external: true, path: 'pg' })
    expect(resolve({ path: 'better-sqlite3' })).toStrictEqual({
      external: true,
      path: 'better-sqlite3',
    })
  })

  it('should mark bare specifiers as external in normal mode when not matching alwaysBundlePatterns', () => {
    const plugin = createExternalsPlugin(defaultParams)
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn

    expect(resolve({ path: 'lodash' })).toStrictEqual({ external: true, path: 'lodash' })
    expect(resolve({ path: 'express' })).toStrictEqual({ external: true, path: 'express' })
  })

  it('should pass through specifiers matching alwaysBundlePatterns in normal mode', () => {
    const plugin = createExternalsPlugin(defaultParams)
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn

    expect(resolve({ path: '@kidd-cli/core' })).toBeUndefined()
    expect(resolve({ path: 'kidd' })).toBeUndefined()
  })

  it('should pass through non-builtin non-external bare specifiers in compile mode', () => {
    const plugin = createExternalsPlugin({ ...defaultParams, compile: true })
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn

    expect(resolve({ path: 'lodash' })).toBeUndefined()
    expect(resolve({ path: 'express' })).toBeUndefined()
  })

  it('should still mark builtins and user externals as external in compile mode', () => {
    const plugin = createExternalsPlugin({ ...defaultParams, compile: true })
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn

    expect(resolve({ path: 'fs' })).toStrictEqual({ external: true, path: 'fs' })
    expect(resolve({ path: 'pg' })).toStrictEqual({ external: true, path: 'pg' })
  })
})

describe('createStubPlugin', () => {
  const packages = ['chokidar', 'magicast', 'react-devtools-core'] as const

  it('should return a BunPlugin with name kidd-stub-packages', () => {
    const plugin = createStubPlugin(packages)

    expect(plugin.name).toBe('kidd-stub-packages')
    expect(plugin.setup).toBeTypeOf('function')
  })

  it('should resolve matching packages to kidd-stub namespace', () => {
    const plugin = createStubPlugin(packages)
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolve = onResolveCalls[0].fn

    expect(resolve({ path: 'chokidar' })).toStrictEqual({
      namespace: 'kidd-stub',
      path: 'chokidar',
    })
    expect(resolve({ path: 'magicast' })).toStrictEqual({
      namespace: 'kidd-stub',
      path: 'magicast',
    })
  })

  it('should not intercept non-matching packages', () => {
    const plugin = createStubPlugin(packages)
    const { mockBuild, onResolveCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const resolveFilter = onResolveCalls[0].filter

    expect(resolveFilter.test('lodash')).toBe(false)
    expect(resolveFilter.test('express')).toBe(false)
  })

  it('should return stub contents from onLoad handler', () => {
    const plugin = createStubPlugin(packages)
    const { mockBuild, onLoadCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    const load = onLoadCalls[0].fn
    const result = load({ path: 'chokidar' })

    expect(result).toStrictEqual({
      contents: 'export default undefined;',
      loader: 'js',
    })
  })

  it('should register onLoad handler with kidd-stub namespace', () => {
    const plugin = createStubPlugin(packages)
    const { mockBuild, onLoadCalls } = createMockBuild()

    plugin.setup(mockBuild as never)

    expect(onLoadCalls[0].namespace).toBe('kidd-stub')
  })
})
