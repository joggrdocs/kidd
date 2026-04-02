import { access } from 'node:fs/promises'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { exists } from './fs.js'

vi.mock(import('node:fs/promises'))

describe(exists, () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return true when path exists', async () => {
    vi.mocked(access).mockResolvedValue(undefined)
    const result = await exists('/some/existing/file.txt')
    expect(result).toBeTruthy()
  })

  it('should return false when path does not exist', async () => {
    vi.mocked(access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    const result = await exists('/some/missing/file.txt')
    expect(result).toBeFalsy()
  })

  it('should return false on permission error', async () => {
    vi.mocked(access).mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' }))
    const result = await exists('/some/restricted/file.txt')
    expect(result).toBeFalsy()
  })
})
