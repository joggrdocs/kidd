import type { FSWatcher } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:fs'))
vi.mock(import('./build.js'))

const { watch: fsWatch } = await import('node:fs')
const { build } = await import('./build.js')
const { watch } = await import('./watch.js')

const mockBuild = vi.mocked(build)
const mockFsWatch = vi.mocked(fsWatch)

type WatchCallback = (_eventType: string, filename: string | null) => void

const createMockWatcher = (): { readonly watcher: FSWatcher; readonly close: ReturnType<typeof vi.fn> } => {
  const close = vi.fn()
  const watcher = { close } as unknown as FSWatcher
  return { watcher, close }
}

const captureWatchCallback = (): WatchCallback => {
  const call = mockFsWatch.mock.calls[0]
  return call[2] as WatchCallback
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('watch operation', () => {
  it('should return err when initial build fails', async () => {
    const buildError = new Error('build failed')
    mockBuild.mockResolvedValueOnce([buildError, null])

    const [error, output] = await watch({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('initial build failed')
  })

  it('should call onSuccess after initial build', async () => {
    const { watcher } = createMockWatcher()
    mockBuild.mockResolvedValueOnce([null, undefined])
    mockFsWatch.mockReturnValueOnce(watcher)
    const onSuccess = vi.fn().mockResolvedValue(undefined)

    const promise = watch({ config: {}, cwd: '/project', onSuccess })

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    process.emit('SIGINT', 'SIGINT')
    const [error] = await promise

    expect(error).toBeNull()
  })

  it('should return ok after signal cleanup', async () => {
    const { watcher, close } = createMockWatcher()
    mockBuild.mockResolvedValueOnce([null, undefined])
    mockFsWatch.mockReturnValueOnce(watcher)

    const promise = watch({ config: {}, cwd: '/project' })

    await vi.waitFor(() => {
      expect(mockFsWatch).toHaveBeenCalledTimes(1)
    })

    process.emit('SIGINT', 'SIGINT')
    const [error, output] = await promise

    expect(error).toBeNull()
    expect(output).toBeUndefined()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('should call build on file changes', async () => {
    const { watcher } = createMockWatcher()
    mockBuild.mockResolvedValue([null, undefined])
    mockFsWatch.mockReturnValueOnce(watcher)

    const promise = watch({ config: {}, cwd: '/project' })

    await vi.waitFor(() => {
      expect(mockFsWatch).toHaveBeenCalledTimes(1)
    })

    const callback = captureWatchCallback()
    callback('change', 'src/index.ts')

    await vi.waitFor(() => {
      expect(mockBuild).toHaveBeenCalledTimes(2)
    })

    process.emit('SIGINT', 'SIGINT')
    await promise
  })

  it('should ignore node_modules changes', async () => {
    const { watcher } = createMockWatcher()
    mockBuild.mockResolvedValue([null, undefined])
    mockFsWatch.mockReturnValueOnce(watcher)

    const promise = watch({ config: {}, cwd: '/project' })

    await vi.waitFor(() => {
      expect(mockFsWatch).toHaveBeenCalledTimes(1)
    })

    const callback = captureWatchCallback()
    callback('change', 'node_modules/foo/index.js')

    await new Promise((resolve) => {
      setTimeout(resolve, 300)
    })

    expect(mockBuild).toHaveBeenCalledTimes(1)

    process.emit('SIGINT', 'SIGINT')
    await promise
  })

  it('should ignore dist changes', async () => {
    const { watcher } = createMockWatcher()
    mockBuild.mockResolvedValue([null, undefined])
    mockFsWatch.mockReturnValueOnce(watcher)

    const promise = watch({ config: {}, cwd: '/project' })

    await vi.waitFor(() => {
      expect(mockFsWatch).toHaveBeenCalledTimes(1)
    })

    const callback = captureWatchCallback()
    callback('change', 'dist/index.js')

    await new Promise((resolve) => {
      setTimeout(resolve, 300)
    })

    expect(mockBuild).toHaveBeenCalledTimes(1)

    process.emit('SIGINT', 'SIGINT')
    await promise
  })
})
