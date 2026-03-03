import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'))
vi.mock(import('tsdown'))

const { existsSync } = await import('node:fs')
const { build: tsdownBuild } = await import('tsdown')
const { build } = await import('./build.js')

const mockExistsSync = vi.mocked(existsSync)
const mockTsdownBuild = vi.mocked(tsdownBuild)

beforeEach(() => {
  vi.clearAllMocks()
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
    })
  })

  it('should return err with Error on tsdown failure', async () => {
    mockTsdownBuild.mockRejectedValueOnce(new Error('tsdown crashed'))
    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('tsdown build failed') })
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
})
