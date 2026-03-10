import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'))
vi.mock(import('tsdown'))
vi.mock(import('./read-version.js'))

const { existsSync } = await import('node:fs')
const { build: tsdownBuild } = await import('tsdown')
const { readVersion } = await import('./read-version.js')
const { build } = await import('./build.js')

const mockExistsSync = vi.mocked(existsSync)
const mockTsdownBuild = vi.mocked(tsdownBuild)
const mockReadVersion = vi.mocked(readVersion)

beforeEach(() => {
  vi.clearAllMocks()
  mockReadVersion.mockResolvedValue([null, '1.0.0'])
})

describe('build operation', () => {
  it('should return ok with build output on success', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      entryFile: expect.stringMatching(/index\.mjs$/),
      outDir: expect.stringContaining('dist'),
      version: '1.0.0',
    })
  })

  it('should return err with Error on tsdown failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(function noop() {})
    mockTsdownBuild.mockRejectedValueOnce(new Error('tsdown crashed'))
    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('tsdown build failed') })
    expect(errorSpy).toHaveBeenCalled()
  })

  it('should return err when no entry file is produced', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockReturnValue(false)

    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('no entry file') })
  })

  it('should pass inline config to tsdown build', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    await build({ config: { build: { minify: true } }, cwd: '/project' })

    expect(mockTsdownBuild).toHaveBeenCalledWith(expect.objectContaining({ minify: true }))
  })

  it('should include version in build output', async () => {
    mockReadVersion.mockResolvedValueOnce([null, '2.5.0'])
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    const [, output] = await build({ config: {}, cwd: '/project' })

    expect(output!.version).toBe('2.5.0')
  })

  it('should warn and continue when readVersion fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(function noop() {})
    mockReadVersion.mockResolvedValueOnce([new Error('ENOENT'), null])
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(error).toBeNull()
    expect(output!.version).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[kidd-bundler]'),
      expect.stringContaining('ENOENT')
    )
  })

  it('should inject __KIDD_VERSION__ define when version is available', async () => {
    mockReadVersion.mockResolvedValueOnce([null, '4.0.0'])
    mockTsdownBuild.mockResolvedValueOnce([])
    mockExistsSync.mockImplementation((p) => String(p).endsWith('index.mjs'))

    await build({ config: {}, cwd: '/project' })

    expect(mockTsdownBuild).toHaveBeenCalledWith(
      expect.objectContaining({ define: { __KIDD_VERSION__: '"4.0.0"' } })
    )
  })
})
