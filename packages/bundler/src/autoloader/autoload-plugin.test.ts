import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('./generate-autoloader.js'))
vi.mock(import('./scan-commands.js'))
vi.mock(import('node:fs'))

const { generateStaticAutoloader } = await import('./generate-autoloader.js')
const { scanCommandsDir } = await import('./scan-commands.js')
const { readFileSync } = await import('node:fs')
const { createAutoloadPlugin } = await import('./autoload-plugin.js')

const mockGenerateStaticAutoloader = vi.mocked(generateStaticAutoloader)
const mockScanCommandsDir = vi.mocked(scanCommandsDir)
const mockReadFileSync = vi.mocked(readFileSync)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createAutoloadPlugin', () => {
  const onResolveCalls: Array<{ filter: RegExp; fn: Function }> = []
  const onLoadCalls: Array<{ filter: RegExp; namespace?: string; fn: Function }> = []
  const mockBuild = {
    onResolve: vi.fn((opts: { filter: RegExp }, fn: Function) => {
      onResolveCalls.push({ filter: opts.filter, fn })
    }),
    onLoad: vi.fn((opts: { filter: RegExp; namespace?: string }, fn: Function) => {
      onLoadCalls.push({ filter: opts.filter, namespace: opts.namespace, fn })
    }),
  }

  beforeEach(() => {
    onResolveCalls.length = 0
    onLoadCalls.length = 0

    const plugin = createAutoloadPlugin({
      commandsDir: '/project/commands',
      tagModulePath: '/project/tag.js',
      coreDistPath: '/project/node_modules/@kidd-cli/core/dist/index.js',
    })

    plugin.setup(mockBuild as never)
  })

  describe('onResolve hook', () => {
    it('should resolve virtual module ID', () => {
      const resolveHook = onResolveCalls[0]
      const result = resolveHook.fn({ path: 'virtual:kidd-static-commands' })

      expect(result).toEqual({
        namespace: 'kidd-autoload',
        path: 'virtual:kidd-static-commands',
      })
    })
  })

  describe('onLoad autoload hook', () => {
    it('should call scanCommandsDir and generateStaticAutoloader for virtual module', async () => {
      const scanResult = { dirs: [], files: [] }
      mockScanCommandsDir.mockResolvedValueOnce(scanResult)
      mockGenerateStaticAutoloader.mockReturnValueOnce('generated code')

      const autoloadHook = onLoadCalls.find((c) => c.namespace === 'kidd-autoload')
      const result = await autoloadHook.fn({})

      expect(result).toEqual({ contents: 'generated code', loader: 'js' })
      expect(mockScanCommandsDir).toHaveBeenCalledOnce()
      expect(mockGenerateStaticAutoloader).toHaveBeenCalledOnce()
    })

    it('should pass commandsDir and tagModulePath to generators', async () => {
      const scanResult = { dirs: [], files: [] }
      mockScanCommandsDir.mockResolvedValueOnce(scanResult)
      mockGenerateStaticAutoloader.mockReturnValueOnce('generated code')

      const autoloadHook = onLoadCalls.find((c) => c.namespace === 'kidd-autoload')
      await autoloadHook.fn({})

      expect(mockScanCommandsDir).toHaveBeenCalledWith('/project/commands')
      expect(mockGenerateStaticAutoloader).toHaveBeenCalledWith({
        scan: scanResult,
        tagModulePath: '/project/tag.js',
      })
    })
  })

  describe('onLoad transform hook', () => {
    it('should return undefined when no region start marker found', () => {
      const transformHook = onLoadCalls.find((c) => c.namespace !== 'kidd-autoload')

      mockReadFileSync.mockReturnValueOnce('const x = 1\nconst y = 2\n')

      const result = transformHook.fn({
        path: '/project/node_modules/@kidd-cli/core/dist/index.js',
      })

      expect(result).toBeUndefined()
    })

    it('should replace region with static import when markers found', () => {
      const transformHook = onLoadCalls.find((c) => c.namespace !== 'kidd-autoload')

      const code = [
        'const before = 1',
        '//#region src/autoload.ts',
        'async function autoload() { return {} }',
        '//#endregion',
        'const after = 2',
      ].join('\n')

      mockReadFileSync.mockReturnValueOnce(code)

      const result = transformHook.fn({
        path: '/project/node_modules/@kidd-cli/core/dist/index.js',
      })

      expect(result).toEqual({ contents: expect.any(String), loader: 'js' })
      expect(result.contents).toContain('const before = 1')
      expect(result.contents).toContain('const after = 2')
      expect(result.contents).toContain('//#region src/autoload.ts (static)')
      expect(result.contents).toContain("await import('virtual:kidd-static-commands')")
      expect(result.contents).toContain('return mod.autoload()')
      expect(result.contents).not.toContain('async function autoload() { return {} }')
    })

    it('should return undefined when code has end marker but no start marker', () => {
      const transformHook = onLoadCalls.find((c) => c.namespace !== 'kidd-autoload')

      mockReadFileSync.mockReturnValueOnce('const x = 1\n//#endregion\n')

      const result = transformHook.fn({
        path: '/project/node_modules/@kidd-cli/core/dist/index.js',
      })

      expect(result).toBeUndefined()
    })
  })
})
