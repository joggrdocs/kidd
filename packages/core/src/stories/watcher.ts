import { watch } from 'node:fs'
import { resolve } from 'node:path'

import type { StoryImporter } from './importer.js'
import type { StoryRegistry } from './registry.js'
import { STORY_FILE_SUFFIXES } from './types.js'

/**
 * Options for creating a story watcher.
 */
export interface WatcherOptions {
  readonly directories: readonly string[]
  readonly importer: StoryImporter
  readonly registry: StoryRegistry
  readonly debounceMs?: number
}

/**
 * A running story watcher that can be closed.
 */
export interface StoryWatcher {
  readonly close: () => void
}

/**
 * Create a file watcher that monitors story directories for changes.
 *
 * Uses `node:fs.watch` with recursive mode. Debounces rapid FS events
 * and re-imports changed story files via the importer.
 *
 * @param options - Watcher configuration.
 * @returns A frozen {@link StoryWatcher} that can be closed to stop watching.
 */
export function createStoryWatcher(options: WatcherOptions): StoryWatcher {
  const debounceMs = options.debounceMs ?? 150
  const watchers = options.directories.map((dir) => {
    const watcher = watch(dir, { recursive: true }, (_event, filename) => {
      if (filename === null || filename === undefined) {
        return
      }
      if (!isStoryFile(filename)) {
        return
      }
      const absolutePath = resolve(dir, filename)
      debouncedReload(absolutePath, debounceMs, state, options)
    })
    return watcher
  })

  const state: WatcherState = {
    timers: new Map<string, ReturnType<typeof setTimeout>>(),
    watchers,
  }

  return Object.freeze({
    close: (): void => {
      const _closed = state.watchers.map(closeWatcher)
      const _cleared = [...state.timers.values()].map(clearTimer)
      state.timers.clear()
    },
  })
}

// ---------------------------------------------------------------------------

/**
 * Internal mutable state for the watcher.
 *
 * @private
 */
interface WatcherState {
  readonly timers: Map<string, ReturnType<typeof setTimeout>>
  readonly watchers: readonly ReturnType<typeof watch>[]
}

/**
 * Close an fs watcher and return it.
 *
 * @private
 * @param watcher - The watcher to close.
 * @returns The closed watcher.
 */
function closeWatcher(watcher: ReturnType<typeof watch>): ReturnType<typeof watch> {
  watcher.close()
  return watcher
}

/**
 * Clear a timeout and return its id.
 *
 * @private
 * @param timer - The timer to clear.
 * @returns The cleared timer id.
 */
function clearTimer(timer: ReturnType<typeof setTimeout>): ReturnType<typeof setTimeout> {
  clearTimeout(timer)
  return timer
}

/**
 * Check if a filename matches the story file convention.
 *
 * @private
 * @param filename - The filename to check.
 * @returns `true` when the filename ends with a story extension.
 */
function isStoryFile(filename: string): boolean {
  return STORY_FILE_SUFFIXES.some((suffix) => filename.endsWith(suffix))
}

/**
 * Debounce a reload for the given file path.
 *
 * @private
 * @param filePath - Absolute path to the changed story file.
 * @param debounceMs - Debounce interval in milliseconds.
 * @param state - The mutable watcher state.
 * @param options - The watcher options containing importer and registry.
 */
function debouncedReload(
  filePath: string,
  debounceMs: number,
  state: WatcherState,
  options: WatcherOptions
): void {
  const existing = state.timers.get(filePath)
  if (existing !== null && existing !== undefined) {
    clearTimeout(existing)
  }
  const timer = setTimeout(() => {
    state.timers.delete(filePath)
    reloadStoryFile(filePath, options).catch(() => undefined)
  }, debounceMs)
  state.timers.set(filePath, timer)
}

/**
 * Re-import a story file and update the registry.
 *
 * @private
 * @param filePath - Absolute path to the story file.
 * @param options - The watcher options containing importer and registry.
 */
async function reloadStoryFile(filePath: string, options: WatcherOptions): Promise<void> {
  const [importError, entry] = await options.importer.importStory(filePath)
  if (importError) {
    options.registry.remove(filePath)
    return
  }
  options.registry.set(filePath, entry)
}
