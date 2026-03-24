import type { FSWatcher } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoryImporter } from './importer.js'
import type { StoryRegistry } from './registry.js'
import type { StoryEntry } from './types.js'
import { createStoryWatcher } from './watcher.js'

type WatchCallback = (event: string, filename: string | null) => void

vi.mock(import('node:fs'), () => ({
  watch: vi.fn(() => ({
    close: vi.fn(),
  })),
}))

function createMockImporter(
  result: [Error, null] | [null, StoryEntry] = [null, {} as StoryEntry]
): StoryImporter {
  return Object.freeze({
    importStory: vi.fn(() => Promise.resolve(result)),
  })
}

function createMockRegistry(): StoryRegistry {
  return Object.freeze({
    getAll: vi.fn(() => new Map()),
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(() => true),
    clear: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    getSnapshot: vi.fn(() => new Map()),
  })
}

describe('story watcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('should return a watcher with a close method', () => {
    const watcher = createStoryWatcher({
      directories: [],
      importer: createMockImporter(),
      registry: createMockRegistry(),
    })

    expect(watcher).toHaveProperty('close')
    expect(typeof watcher.close).toBe('function')
  })

  it('should create a fs watcher for each directory', async () => {
    const { watch } = await import('node:fs')

    createStoryWatcher({
      directories: ['/app/src', '/app/lib'],
      importer: createMockImporter(),
      registry: createMockRegistry(),
    })

    expect(watch).toHaveBeenCalledTimes(2)
    expect(watch).toHaveBeenCalledWith('/app/src', { recursive: true }, expect.any(Function))
    expect(watch).toHaveBeenCalledWith('/app/lib', { recursive: true }, expect.any(Function))
  })

  it('should close all fs watchers on close', async () => {
    const closeFn = vi.fn()
    const { watch } = await import('node:fs')
    vi.mocked(watch).mockReturnValue({ close: closeFn } as unknown as FSWatcher)

    const watcher = createStoryWatcher({
      directories: ['/app/src'],
      importer: createMockImporter(),
      registry: createMockRegistry(),
    })

    watcher.close()

    expect(closeFn).toHaveBeenCalledOnce()
  })

  it('should debounce and reload a story file on change', async () => {
    const { watch } = await import('node:fs')
    const callbacks: WatchCallback[] = []

    vi.mocked(watch).mockImplementation((_path, _opts, cb) => {
      if (typeof cb === 'function') {
        callbacks.push(cb as WatchCallback)
      }
      return { close: vi.fn() } as unknown as FSWatcher
    })

    const registry = createMockRegistry()
    const importer = createMockImporter()

    createStoryWatcher({
      directories: ['/app/src'],
      importer,
      registry,
      debounceMs: 50,
    })

    callbacks[0]('change', 'button.stories.tsx')

    expect(importer.importStory).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(60)

    expect(importer.importStory).toHaveBeenCalledOnce()
  })

  it('should ignore non-story files', async () => {
    const { watch } = await import('node:fs')
    const callbacks: WatchCallback[] = []

    vi.mocked(watch).mockImplementation((_path, _opts, cb) => {
      if (typeof cb === 'function') {
        callbacks.push(cb as WatchCallback)
      }
      return { close: vi.fn() } as unknown as FSWatcher
    })

    const importer = createMockImporter()

    createStoryWatcher({
      directories: ['/app/src'],
      importer,
      registry: createMockRegistry(),
      debounceMs: 50,
    })

    callbacks[0]('change', 'utils.ts')
    await vi.advanceTimersByTimeAsync(60)

    expect(importer.importStory).not.toHaveBeenCalled()
  })

  it('should ignore null filenames', async () => {
    const { watch } = await import('node:fs')
    const callbacks: WatchCallback[] = []

    vi.mocked(watch).mockImplementation((_path, _opts, cb) => {
      if (typeof cb === 'function') {
        callbacks.push(cb as WatchCallback)
      }
      return { close: vi.fn() } as unknown as FSWatcher
    })

    const importer = createMockImporter()

    createStoryWatcher({
      directories: ['/app/src'],
      importer,
      registry: createMockRegistry(),
    })

    callbacks[0]('change', null)
    await vi.advanceTimersByTimeAsync(200)

    expect(importer.importStory).not.toHaveBeenCalled()
  })

  it('should remove from registry when import fails', async () => {
    const { watch } = await import('node:fs')
    const callbacks: WatchCallback[] = []

    vi.mocked(watch).mockImplementation((_path, _opts, cb) => {
      if (typeof cb === 'function') {
        callbacks.push(cb as WatchCallback)
      }
      return { close: vi.fn() } as unknown as FSWatcher
    })

    const registry = createMockRegistry()
    const importer = createMockImporter([new Error('syntax error'), null])

    createStoryWatcher({
      directories: ['/app/src'],
      importer,
      registry,
      debounceMs: 10,
    })

    callbacks[0]('change', 'broken.stories.ts')
    await vi.advanceTimersByTimeAsync(20)

    expect(registry.remove).toHaveBeenCalled()
  })

  it('should set entry in registry when import succeeds', async () => {
    const { watch } = await import('node:fs')
    const callbacks: WatchCallback[] = []

    vi.mocked(watch).mockImplementation((_path, _opts, cb) => {
      if (typeof cb === 'function') {
        callbacks.push(cb as WatchCallback)
      }
      return { close: vi.fn() } as unknown as FSWatcher
    })

    const mockEntry = {} as StoryEntry
    const registry = createMockRegistry()
    const importer = createMockImporter([null, mockEntry])

    createStoryWatcher({
      directories: ['/app/src'],
      importer,
      registry,
      debounceMs: 10,
    })

    callbacks[0]('change', 'card.stories.tsx')
    await vi.advanceTimersByTimeAsync(20)

    expect(registry.set).toHaveBeenCalled()
  })
})
