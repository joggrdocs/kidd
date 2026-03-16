import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'

import { describe, expect, it, vi, beforeEach } from 'vitest'

import { scanCommandsDir } from './scan-commands.js'

vi.mock(import('node:fs/promises'), () => ({
  readdir: vi.fn(),
}))

function makeDirent(name: string, isFile: boolean): Dirent {
  return {
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isDirectory: () => !isFile,
    isFIFO: () => false,
    isFile: () => isFile,
    isSocket: () => false,
    isSymbolicLink: () => false,
    name,
    parentPath: '',
    path: '',
  } as Dirent
}

describe('scan commands directory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should scan flat command files', async () => {
    vi.mocked(readdir).mockResolvedValueOnce([
      makeDirent('status.ts', true),
      makeDirent('whoami.js', true),
    ] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    expect(result.files).toStrictEqual([
      { filePath: '/project/commands/status.ts', name: 'status' },
      { filePath: '/project/commands/whoami.js', name: 'whoami' },
    ])
    expect(result.dirs).toStrictEqual([])
  })

  it('should skip files with invalid extensions', async () => {
    vi.mocked(readdir).mockResolvedValueOnce([
      makeDirent('status.ts', true),
      makeDirent('readme.md', true),
      makeDirent('config.json', true),
    ] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    expect(result.files).toHaveLength(1)
    expect(result.files[0]?.name).toBe('status')
  })

  it('should skip files starting with underscore or dot', async () => {
    vi.mocked(readdir).mockResolvedValueOnce([
      makeDirent('_helper.ts', true),
      makeDirent('.hidden.ts', true),
      makeDirent('status.ts', true),
    ] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    expect(result.files).toHaveLength(1)
    expect(result.files[0]?.name).toBe('status')
  })

  it('should skip index files at top level', async () => {
    vi.mocked(readdir).mockResolvedValueOnce([
      makeDirent('index.ts', true),
      makeDirent('status.ts', true),
    ] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    expect(result.files).toHaveLength(1)
    expect(result.files[0]?.name).toBe('status')
  })

  it('should scan subdirectories with index and subcommands', async () => {
    vi.mocked(readdir)
      .mockResolvedValueOnce([makeDirent('deploy', false)] as Dirent[])
      .mockResolvedValueOnce([
        makeDirent('index.ts', true),
        makeDirent('preview.ts', true),
        makeDirent('production.ts', true),
      ] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    expect(result.files).toStrictEqual([])
    expect(result.dirs).toHaveLength(1)

    const [deploy] = result.dirs
    expect(deploy?.name).toBe('deploy')
    expect(deploy?.index).toBe('/project/commands/deploy/index.ts')
    expect(deploy?.files).toStrictEqual([
      { filePath: '/project/commands/deploy/preview.ts', name: 'preview' },
      { filePath: '/project/commands/deploy/production.ts', name: 'production' },
    ])
  })

  it('should handle subdirectories without index file', async () => {
    vi.mocked(readdir)
      .mockResolvedValueOnce([makeDirent('auth', false)] as Dirent[])
      .mockResolvedValueOnce([
        makeDirent('login.ts', true),
        makeDirent('logout.ts', true),
      ] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    const [auth] = result.dirs
    expect(auth?.name).toBe('auth')
    expect(auth?.index).toBeUndefined()
    expect(auth?.files).toHaveLength(2)
  })

  it('should skip hidden and private directories', async () => {
    vi.mocked(readdir).mockResolvedValueOnce([
      makeDirent('_internal', false),
      makeDirent('.hidden', false),
      makeDirent('deploy', false),
    ] as Dirent[])

    vi.mocked(readdir).mockResolvedValueOnce([makeDirent('preview.ts', true)] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    expect(result.dirs).toHaveLength(1)
    expect(result.dirs[0]?.name).toBe('deploy')
  })

  it('should handle nested subdirectories', async () => {
    vi.mocked(readdir)
      .mockResolvedValueOnce([makeDirent('deploy', false)] as Dirent[])
      .mockResolvedValueOnce([makeDirent('cloud', false)] as Dirent[])
      .mockResolvedValueOnce([makeDirent('aws.ts', true), makeDirent('gcp.ts', true)] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    const [deploy] = result.dirs
    expect(deploy?.name).toBe('deploy')
    expect(deploy?.dirs).toHaveLength(1)

    const [cloud] = deploy?.dirs ?? []
    expect(cloud?.name).toBe('cloud')
    expect(cloud?.files).toHaveLength(2)
  })

  it('should handle .mjs extension', async () => {
    vi.mocked(readdir).mockResolvedValueOnce([makeDirent('status.mjs', true)] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    expect(result.files).toHaveLength(1)
    expect(result.files[0]?.name).toBe('status')
  })

  it('should return empty result for empty directory', async () => {
    vi.mocked(readdir).mockResolvedValueOnce([] as Dirent[])

    const result = await scanCommandsDir('/project/commands')

    expect(result.files).toStrictEqual([])
    expect(result.dirs).toStrictEqual([])
  })
})
