import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FileStore } from '@/lib/store/types.js'

vi.mock(import('@/lib/store/create-store.js'), () => ({
  createStore: vi.fn(),
}))

import { createStore } from '@/lib/store/create-store.js'

import { resolveFromFile } from './file.js'

describe('resolveFromFile()', () => {
  const mockStore = {
    load: vi.fn(),
  } as unknown as FileStore

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createStore).mockReturnValue(mockStore)
  })

  it('should return bearer credential when local store loads valid bearer data', () => {
    vi.mocked(mockStore.load).mockReturnValue({ token: 'my-token', type: 'bearer' })

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })

    expect(result).toEqual({ token: 'my-token', type: 'bearer' })
    expect(createStore).toHaveBeenCalledWith({ dirName: '.my-cli' })
    expect(mockStore.load).toHaveBeenCalledWith('credentials.json', { source: 'local' })
  })

  it('should fall back to global when local returns null', () => {
    vi.mocked(mockStore.load)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ token: 'global-token', type: 'bearer' })

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli-global',
      localDirName: '.my-cli-local',
    })

    expect(result).toEqual({ token: 'global-token', type: 'bearer' })
    expect(createStore).toHaveBeenCalledWith({ dirName: '.my-cli-local' })
    expect(createStore).toHaveBeenCalledWith({ dirName: '.my-cli-global' })
    expect(mockStore.load).toHaveBeenCalledWith('credentials.json', { source: 'local' })
    expect(mockStore.load).toHaveBeenCalledWith('credentials.json', { source: 'global' })
  })

  it('should return null when both local and global return null', () => {
    vi.mocked(mockStore.load).mockReturnValue(null)

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })

    expect(result).toBeNull()
  })

  it('should return null when store returns data that fails schema validation', () => {
    vi.mocked(mockStore.load).mockReturnValue({ invalid: 'data' })

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })

    expect(result).toBeNull()
  })

  it('should return basic credential when store loads valid basic auth data', () => {
    vi.mocked(mockStore.load).mockReturnValue({
      password: 's3cret',
      type: 'basic',
      username: 'admin',
    })

    const result = resolveFromFile({
      filename: 'credentials.json',
      globalDirName: '.my-cli',
      localDirName: '.my-cli',
    })

    expect(result).toEqual({ password: 's3cret', type: 'basic', username: 'admin' })
  })
})
