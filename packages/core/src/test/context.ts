import type { Writable } from 'node:stream'

import { match } from 'ts-pattern'
import { vi } from 'vitest'

import { createContext } from '@/context/create-context.js'
import type { Prompts, Spinner } from '@/context/types.js'
import { createCliLogger } from '@/lib/logger.js'
import type { CliLogger } from '@/lib/logger.js'
import type { AnyRecord } from '@/types/index.js'

import { createWritableCapture } from './capture.js'
import type { PromptResponses, TestContextOptions, TestContextResult } from './types.js'

/**
 * Create a fully-mocked {@link Context} for unit testing.
 *
 * All prompts are no-op stubs by default, the logger writes to an in-memory
 * buffer, and the spinner is a no-op. Override any field via `overrides`.
 *
 * @param overrides - Optional overrides for args, config, meta, logger, prompts, or spinner.
 * @returns A TestContextResult with the context and a stdout accessor.
 */
export function createTestContext<
  TArgs extends AnyRecord = AnyRecord,
  TConfig extends AnyRecord = AnyRecord,
>(overrides?: TestContextOptions<TArgs, TConfig>): TestContextResult<TArgs, TConfig> {
  const opts = overrides ?? ({} as TestContextOptions<TArgs, TConfig>)
  const { output, stream } = createWritableCapture()
  const logger = resolveLogger(opts, stream)
  const meta = resolveMeta(opts)

  const ctx = createContext<TArgs, TConfig>({
    args: (opts.args ?? {}) as TArgs,
    config: (opts.config ?? {}) as TConfig,
    logger,
    meta,
    prompts: opts.prompts ?? createStubPrompts(),
    spinner: opts.spinner ?? createStubSpinner(),
  })

  return { ctx, stdout: output }
}

/**
 * Create a {@link Prompts} implementation that consumes pre-programmed responses.
 *
 * Responses are consumed in order — the first call to `confirm()` returns `responses.confirm[0]`,
 * the second returns `responses.confirm[1]`, etc. Throws if the queue is exhausted.
 *
 * @param responses - Ordered queues of responses for each prompt type.
 * @returns A Prompts implementation backed by the given responses.
 */
export function mockPrompts(responses: PromptResponses): Prompts {
  const queues = {
    confirm: [...(responses.confirm ?? [])],
    multiselect: [...(responses.multiselect ?? [])],
    password: [...(responses.password ?? [])],
    select: [...(responses.select ?? [])],
    text: [...(responses.text ?? [])],
  }

  return {
    async confirm(): Promise<boolean> {
      return dequeue(queues.confirm, 'confirm')
    },
    async multiselect<TValue>(): Promise<TValue[]> {
      return dequeue(queues.multiselect, 'multiselect') as TValue[]
    },
    async password(): Promise<string> {
      return dequeue(queues.password, 'password')
    },
    async select<TValue>(): Promise<TValue> {
      return dequeue(queues.select, 'select') as TValue
    },
    async text(): Promise<string> {
      return dequeue(queues.text, 'text')
    },
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the logger from overrides or create one writing to the capture stream.
 *
 * @private
 * @param opts - Test context options.
 * @param stream - The writable capture stream.
 * @returns A CliLogger instance.
 */
function resolveLogger(opts: TestContextOptions, stream: Writable) {
  return match(opts.logger)
    .when(
      (logger): logger is CliLogger => logger !== undefined,
      (logger) => logger
    )
    .otherwise(() => createCliLogger({ output: stream }))
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

/**
 * Create a no-op stub Prompts implementation.
 *
 * @private
 * @returns A Prompts where every method is a vi.fn() stub.
 */
function createStubPrompts(): Prompts {
  return {
    confirm: vi.fn(async () => false),
    multiselect: vi.fn(async () => []),
    password: vi.fn(async () => ''),
    select: vi.fn(async () => undefined) as Prompts['select'],
    text: vi.fn(async () => ''),
  }
}

/**
 * Create a no-op stub Spinner implementation.
 *
 * @private
 * @returns A Spinner where every method is a vi.fn() stub.
 */
function createStubSpinner(): Spinner {
  return {
    message: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}
