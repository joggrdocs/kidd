import { describe, expect, it, vi } from 'vitest'

vi.mock(import('tsdown'))

const { build: tsdownBuild } = await import('tsdown')
const { watch } = await import('./watch.js')

const mockTsdownBuild = vi.mocked(tsdownBuild)

describe('watch operation', () => {
  it('should return ok on success', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    const [error, output] = await watch({ config: {}, cwd: '/project' })

    expect(error).toBeNull()
    expect(output).toBeUndefined()
  })

  it('should return err with Error on failure', async () => {
    mockTsdownBuild.mockRejectedValueOnce(new Error('watch crashed'))
    const [error, output] = await watch({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toContain('tsdown watch failed')
  })

  it('should enable watch mode in tsdown config', async () => {
    mockTsdownBuild.mockResolvedValueOnce([])
    await watch({ config: {}, cwd: '/project' })

    expect(mockTsdownBuild).toHaveBeenCalledWith(expect.objectContaining({ watch: true }))
  })

  it('should pass onSuccess callback to tsdown config', async () => {
    const onSuccess = vi.fn()
    mockTsdownBuild.mockResolvedValueOnce([])
    await watch({ config: {}, cwd: '/project', onSuccess })

    expect(mockTsdownBuild).toHaveBeenCalledWith(expect.objectContaining({ onSuccess }))
  })
})
