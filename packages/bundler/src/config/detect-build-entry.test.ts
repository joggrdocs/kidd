import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'))

const { existsSync } = await import('node:fs')
const { detectBuildEntry } = await import('./resolve-config.js')

const mockExistsSync = vi.mocked(existsSync)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('detectBuildEntry', () => {
  it('should return index.js when it exists', () => {
    mockExistsSync.mockReturnValue(true)

    const result = detectBuildEntry('/project/dist')

    expect(result).toBe(join('/project/dist', 'index.js'))
  })

  it('should return undefined when no entry file exists', () => {
    mockExistsSync.mockReturnValue(false)

    const result = detectBuildEntry('/project/dist')

    expect(result).toBeUndefined()
  })
})
