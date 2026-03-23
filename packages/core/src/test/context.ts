import type { Writable } from 'node:stream'

import { vi } from 'vitest'

import { createContext } from '@/context/create-context.js'
import type { Log, Prompts, Spinner } from '@/context/types.js'
import { createLog } from '@/lib/log.js'
import type { AnyRecord } from '@/types/index.js'

import { createWritableCapture } from './capture.js'
import type { PromptResponses, TestContextOptions, TestContextResult } from './types.js'

/**
 * Create a fully-mocked {@link Context} for unit testing.
 *
 * The log instance writes to an in-memory buffer by default.
 * Override via `overrides.log`, `overrides.prompts`, or `overrides.spinner`.
 *
 * @param overrides - Optional overrides for args, config, meta, log, prompts, or spinner.
 * @returns A TestContextResult with the context and a stdout accessor.
 */
export function createTestContext<
  TArgs extends AnyRecord = AnyRecord,
  TConfig extends AnyRecord = AnyRecord,
>(overrides?: TestContextOptions<TArgs, TConfig>): TestContextResult<TArgs, TConfig> {
  const opts = overrides ?? ({} as TestContextOptions<TArgs, TConfig>)
  const { output, stream } = createWritableCapture()
  const log = resolveLog(opts, stream)
  const prompts = resolvePrompts(opts)
  const spinner = resolveSpinner(opts)
  const meta = resolveMeta(opts)

  const ctx = createContext<TArgs, TConfig>({
    args: (opts.args ?? {}) as TArgs,
    config: (opts.config ?? {}) as TConfig,
    log,
    meta,
    prompts,
    spinner,
  })

  return { ctx, stdout: output }
}

/**
 * Create a {@link Log} implementation with mocked methods.
 *
 * @returns A Log implementation with vi.fn() stubs.
 */
export function mockLog(): Log {
  return {
    error: vi.fn(),
    info: vi.fn(),
    intro: vi.fn(),
    message: vi.fn(),
    newline: vi.fn(),
    note: vi.fn(),
    outro: vi.fn(),
    raw: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  } as Log
}

/**
 * Create a {@link Prompts} implementation with mocked methods that consume
 * pre-programmed responses.
 *
 * Responses are consumed in order — the first call to `confirm()` returns
 * `responses.confirm[0]`, the second returns `responses.confirm[1]`, etc.
 * Throws if the queue is exhausted.
 *
 * @param responses - Ordered queues of responses for each prompt type.
 * @returns A Prompts implementation with vi.fn() stubs and pre-programmed responses.
 */
export function mockPrompts(responses?: PromptResponses): Prompts {
  const r = responses ?? {}
  const queues = {
    confirm: [...(r.confirm ?? [])],
    multiselect: [...(r.multiselect ?? [])],
    password: [...(r.password ?? [])],
    select: [...(r.select ?? [])],
    text: [...(r.text ?? [])],
  }

  return {
    confirm: vi.fn(async () => dequeue(queues.confirm, 'confirm')),
    multiselect: vi.fn(async () => dequeue(queues.multiselect, 'multiselect')),
    password: vi.fn(async () => dequeue(queues.password, 'password')),
    select: vi.fn(async () => dequeue(queues.select, 'select')),
    text: vi.fn(async () => dequeue(queues.text, 'text')),
  } as Prompts
}

/**
 * Create a {@link Spinner} implementation with mocked methods.
 *
 * @returns A Spinner implementation with vi.fn() stubs.
 */
export function mockSpinner(): Spinner {
  return {
    message: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  } as Spinner
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the log instance from overrides or create one writing to the capture stream.
 *
 * @private
 * @param opts - Test context options.
 * @param stream - The writable capture stream.
 * @returns A Log instance.
 */
function resolveLog(opts: TestContextOptions, stream: Writable): Log {
  if (opts.log !== undefined) {
    return opts.log
  }
  return createLog({ output: stream })
}

/**
 * Resolve the prompts instance from overrides or create a mock.
 *
 * @private
 * @param opts - Test context options.
 * @returns A Prompts instance.
 */
function resolvePrompts(opts: TestContextOptions): Prompts {
  if (opts.prompts !== undefined) {
    return opts.prompts
  }
  return mockPrompts()
}

/**
 * Resolve the spinner instance from overrides or create a mock.
 *
 * @private
 * @param opts - Test context options.
 * @returns A Spinner instance.
 */
function resolveSpinner(opts: TestContextOptions): Spinner {
  if (opts.spinner !== undefined) {
    return opts.spinner
  }
  return mockSpinner()
}

/**
 * Resolve meta from overrides with defaults.
 *
 * @private
 * @param opts - Test context options.
 * @returns A meta object with command, name, and version.
 */
function resolveMeta(opts: TestContextOptions) {
  const meta = opts.meta ?? {}
  const name = meta.name ?? 'test-app'
  return {
    command: meta.command ?? ['test'],
    dirs: meta.dirs ?? { global: `.${name}`, local: `.${name}` },
    name,
    version: meta.version ?? '0.0.0',
  }
}

/**
 * Dequeue the next response from a queue, throwing if exhausted.
 *
 * @private
 * @param queue - The mutable response queue.
 * @param name - The prompt type name (for error messages).
 * @returns The next response value.
 */
function dequeue<TValue>(queue: TValue[], name: string): TValue {
  const value = queue.shift()
  if (value === undefined) {
    // Accepted exception: test helper — explicit throw for developer feedback.
    throw new Error(`mockPrompts: ${name} response queue exhausted`)
  }
  return value
}
