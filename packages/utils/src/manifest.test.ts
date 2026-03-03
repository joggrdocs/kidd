import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readManifest } from './manifest.js'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

const mockedReadFile = vi.mocked(readFile)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('readManifest', () => {
  it('should return manifest when valid package.json exists', async () => {
    const pkg = {
      name: 'my-pkg',
      version: '1.0.0',
      description: 'A test package',
      license: 'MIT',
      author: 'Alice',
      repository: 'https://github.com/test/repo',
      homepage: 'https://example.com',
      keywords: ['test', 'example'],
      bin: { cli: './bin/cli.js' },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).toEqual({
      name: 'my-pkg',
      version: '1.0.0',
      description: 'A test package',
      license: 'MIT',
      author: 'Alice',
      repository: 'https://github.com/test/repo',
      homepage: 'https://example.com',
      keywords: ['test', 'example'],
      bin: { cli: './bin/cli.js' },
    })
  })

  it('should return error when file not found', async () => {
    mockedReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'))

    const [error, manifest] = await readManifest('/missing')

    expect(manifest).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeNull()
    const filePath = resolve('/missing', 'package.json')
    expect(error!.message).toContain(`Failed to read ${filePath}`)
    expect(error!.message).toContain('ENOENT')
  })

  it('should return error when file contains invalid JSON', async () => {
    mockedReadFile.mockResolvedValueOnce('{ not valid json }}}')

    const [error, manifest] = await readManifest('/project')

    expect(manifest).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Failed to parse JSON')
  })

  it('should return manifest with undefined for missing optional fields', async () => {
    const pkg = {}
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).toEqual({
      name: undefined,
      version: undefined,
      description: undefined,
      license: undefined,
      author: undefined,
      repository: undefined,
      homepage: undefined,
      keywords: [],
      bin: undefined,
    })
  })

  it('should normalize author object to string', async () => {
    const pkg = {
      author: { name: 'Bob', email: 'bob@example.com', url: 'https://bob.dev' },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.author).toBe('Bob')
  })

  it('should normalize repository object to URL string', async () => {
    const pkg = {
      repository: {
        type: 'git',
        url: 'https://github.com/test/repo.git',
        directory: 'packages/core',
      },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.repository).toBe('https://github.com/test/repo.git')
  })

  it('should normalize string bin to record', async () => {
    const pkg = {
      bin: './bin/index.js',
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.bin).toEqual({ '': './bin/index.js' })
  })

  it('should pass through keywords array', async () => {
    const pkg = {
      keywords: ['cli', 'tool', 'typescript'],
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.keywords).toEqual(['cli', 'tool', 'typescript'])
  })

  it('should pass through record bin', async () => {
    const pkg = {
      bin: { serve: './bin/serve.js', build: './bin/build.js' },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.bin).toEqual({ serve: './bin/serve.js', build: './bin/build.js' })
  })
})

describe('readManifest integration', () => {
  it('should handle author as string', async () => {
    const pkg = { author: 'Jane Doe' }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.author).toBe('Jane Doe')
  })

  it('should handle author as object with email and url', async () => {
    const pkg = {
      author: {
        name: 'Jane',
        email: 'jane@example.com',
        url: 'https://jane.dev',
      },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.author).toBe('Jane')
  })

  it('should handle repository as string', async () => {
    const pkg = { repository: 'github:user/repo' }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.repository).toBe('github:user/repo')
  })

  it('should return error for schema validation failure', async () => {
    const pkg = {
      author: { email: 'missing-name@example.com' },
    }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    const [error, manifest] = await readManifest('/project')

    expect(manifest).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('Invalid package.json')
  })

  it('should resolve path using provided directory', async () => {
    const pkg = { name: 'test' }
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(pkg))

    await readManifest('/custom/dir')

    const expectedPath = resolve('/custom/dir', 'package.json')
    expect(mockedReadFile).toHaveBeenCalledWith(expectedPath, 'utf8')
  })
})
