import { Writable } from 'node:stream'

import { afterEach, beforeEach, vi } from 'vitest'

import { cli } from '@/cli.js'

/**
 * Override process.argv for CLI testing.
 */
export function setArgv(...args: readonly string[]): void {
  process.argv = ['node', 'test', ...args]
}

/**
 * Run the CLI and wait for async completion.
 */
export async function runTestCli(options: Parameters<typeof cli>[0]): Promise<void> {
  await cli(options)
}

/**
 * Return type for {@link setupTestLifecycle}.
 */
export interface TestLifecycle {
  getExitSpy(): ReturnType<typeof vi.spyOn>
}

/**
 * Wire up beforeEach / afterEach hooks that save and restore process.argv,
 * stub process.exit, and clear all mocks between tests.
 *
 * @returns An object with a `getExitSpy` accessor for assertions.
 */
export function setupTestLifecycle(): TestLifecycle {
  let originalArgv: string[]
  let exitSpy: ReturnType<typeof vi.spyOn>

  // eslint-disable-next-line jest/no-hooks -- lifecycle encapsulation for test helpers
  beforeEach(() => {
    originalArgv = process.argv
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never)
    vi.clearAllMocks()
  })

  // eslint-disable-next-line jest/no-hooks -- lifecycle encapsulation for test helpers
  afterEach(() => {
    process.argv = originalArgv
    exitSpy.mockRestore()
  })

  return {
    getExitSpy: () => exitSpy,
  }
}

/**
 * Return type for {@link createWritableCapture}.
 */
export interface WritableCapture {
  readonly output: () => string
  readonly stream: NodeJS.WriteStream
}

/**
 * Create a writable stream that captures all written data into a string buffer.
 * Useful for asserting against `ctx.output.*` calls in handler tests.
 */
export function createWritableCapture(): WritableCapture {
  let data = ''
  const stream = new Writable({
    write(chunk: Buffer, _encoding: string, callback: () => void): void {
      data += chunk.toString()
      callback()
    },
  }) as unknown as NodeJS.WriteStream
  return { output: () => data, stream }
}
