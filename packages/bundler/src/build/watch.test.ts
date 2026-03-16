import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('tsdown'))
vi.mock(import('../config/read-version.js'))

const { build: tsdownBuild } = await import('tsdown')
const { readVersion } = await import('../config/read-version.js')
const { watch } = await import('./watch.js')

const mockTsdownBuild = vi.mocked(tsdownBuild)
const mockReadVersion = vi.mocked(readVersion)

beforeEach(() => {
  vi.clearAllMocks()
  mockReadVersion.mockResolvedValue([null, '1.0.0'])
})

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

  it('should pass version define to tsdown config', async () => {
    mockReadVersion.mockResolvedValueOnce([null, '2.0.0'])
    mockTsdownBuild.mockResolvedValueOnce([])

    await watch({ config: {}, cwd: '/project' })

    expect(mockTsdownBuild).toHaveBeenCalledWith(
      expect.objectContaining({ define: { __KIDD_VERSION__: '"2.0.0"' } })
    )
  })

  it('should warn and continue when readVersion fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(function noop() {})
    mockReadVersion.mockResolvedValueOnce([new Error('ENOENT'), null])
    mockTsdownBuild.mockResolvedValueOnce([])

    const [error] = await watch({ config: {}, cwd: '/project' })

    expect(error).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[kidd-bundler]'),
      expect.stringContaining('ENOENT')
    )
  })
})
