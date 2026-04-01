import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'))
vi.mock(import('tsdown'))
vi.mock(import('../config/read-version.js'))

const { existsSync } = await import('node:fs')
const { build: tsdownBuild } = await import('tsdown')
const { readVersion } = await import('../config/read-version.js')
const { build } = await import('./build.js')

const mockExistsSync = vi.mocked(existsSync)
const mockTsdownBuild = vi.mocked(tsdownBuild)
const mockReadVersion = vi.mocked(readVersion)

const resolved = {
  entry: '/project/src/index.ts',
  commands: '/project/commands',
  buildOutDir: '/project/dist',
  compileOutDir: '/project/dist',
  build: {
    target: 'node18',
    minify: false,
    sourcemap: true,
    external: [],
    clean: false,
  },
  compile: { targets: [], name: 'cli' },
  include: [],
  cwd: '/project',
} as const

beforeEach(() => {
  vi.clearAllMocks()
  mockReadVersion.mockResolvedValue([null, '1.0.0'])
})

describe('build operation', () => {
  it('should return ok with build output on success', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    const [error, output] = await build({ resolved, compile: false })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      entryFile: expect.stringMatching(/index\.mjs$/),
      outDir: expect.stringContaining('dist'),
      version: '1.0.0',
    })
  })

  it('should return err with Error on tsdown failure', async () => {
    mockTsdownBuild.mockRejectedValueOnce(new Error('tsdown crashed'))
    const [error, output] = await build({ resolved, compile: false })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('tsdown build failed') })
  })

  it('should return err when no entry file is produced', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockReturnValue(false)

    const [error, output] = await build({ resolved, compile: false })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('no entry file') })
  })

  it('should pass inline config to tsdown build', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    const minifyResolved = { ...resolved, build: { ...resolved.build, minify: true } }
    await build({ resolved: minifyResolved, compile: false })

    expect(mockTsdownBuild).toHaveBeenCalledWith(expect.objectContaining({ minify: true }))
  })

  it('should include version in build output', async () => {
    mockReadVersion.mockResolvedValueOnce([null, '2.5.0'])
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    const [, output] = await build({ resolved, compile: false })

    expect(output).toMatchObject({ version: '2.5.0' })
  })

  it('should continue with undefined version when readVersion fails', async () => {
    mockReadVersion.mockResolvedValueOnce([new Error('ENOENT'), null])
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    const [error, output] = await build({ resolved, compile: false })

    expect(error).toBeNull()
    expect(output).toHaveProperty('version', undefined)
  })

  it('should inject __KIDD_VERSION__ define when version is available', async () => {
    mockReadVersion.mockResolvedValueOnce([null, '4.0.0'])
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    await build({ resolved, compile: false })

    expect(mockTsdownBuild).toHaveBeenCalledWith(
      expect.objectContaining({ define: { __KIDD_VERSION__: '"4.0.0"' } })
    )
  })
})
