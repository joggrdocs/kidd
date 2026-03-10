import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('@kidd-cli/utils/manifest'))

const { readManifest } = await import('@kidd-cli/utils/manifest')
const { readVersion } = await import('./read-version.js')

const mockReadManifest = vi.mocked(readManifest)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('readVersion', () => {
  it('should return version when package.json has one', async () => {
    mockReadManifest.mockResolvedValueOnce([
      null,
      {
        author: undefined,
        bin: undefined,
        description: 'test',
        homepage: undefined,
        keywords: [],
        license: undefined,
        name: 'my-cli',
        repository: undefined,
        version: '1.2.3',
      },
    ])

    const [error, version] = await readVersion('/project')

    expect(error).toBeNull()
    expect(version).toBe('1.2.3')
    expect(mockReadManifest).toHaveBeenCalledWith('/project')
  })

  it('should return undefined when package.json has no version field', async () => {
    mockReadManifest.mockResolvedValueOnce([
      null,
      {
        author: undefined,
        bin: undefined,
        description: undefined,
        homepage: undefined,
        keywords: [],
        license: undefined,
        name: 'my-cli',
        repository: undefined,
        version: undefined,
      },
    ])

    const [error, version] = await readVersion('/project')

    expect(error).toBeNull()
    expect(version).toBeUndefined()
  })

  it('should return error when package.json cannot be read', async () => {
    mockReadManifest.mockResolvedValueOnce([new Error('ENOENT'), null])

    const [error, version] = await readVersion('/missing')

    expect(version).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Failed to read version')
  })
})
