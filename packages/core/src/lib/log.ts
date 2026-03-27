/**
 * Factory for creating a {@link Log} instance backed by `@clack/prompts`.
 *
 * @module
 */

import type { Writable } from 'node:stream'

import * as clack from '@clack/prompts'

import type {
  BoxOptions,
  DisplayConfig,
  Log,
  LogMessageOptions,
  NoteOptions,
  StreamLog,
} from '@/context/types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Per-call defaults for clack log methods.
 */
export interface LogDefaults {
  /** Show navigation guide hints. */
  readonly guide?: boolean
  /** Custom output stream. */
  readonly output?: Writable
}

/**
 * Options for {@link createLog}.
 */
export interface CreateLogOptions {
  /**
   * Writable stream for raw output. Defaults to `process.stderr`.
   */
  readonly output?: NodeJS.WritableStream
  /** Per-call defaults merged into every clack log call. Method-level options win. */
  readonly defaults?: LogDefaults
  /** Box display defaults from {@link DisplayConfig}. */
  readonly boxDefaults?: DisplayConfig['box']
}

/**
 * Create a {@link Log} instance that delegates to `@clack/prompts` for
 * structured terminal output.
 *
 * When `defaults` are provided, they are spread as the base of every clack
 * call. Method-level options always take precedence.
 *
 * @param options - Optional configuration for the log instance.
 * @returns A frozen Log object.
 */
export function createLog(options?: CreateLogOptions): Log {
  const output = resolveOutput(options)
  const base = resolveBase(options?.defaults)
  const boxBase = resolveBoxBase(base, options?.boxDefaults)

  return Object.freeze({
    error(message: string, opts?: LogMessageOptions): void {
      clack.log.error(message, { ...base, ...opts })
    },

    info(message: string, opts?: LogMessageOptions): void {
      clack.log.info(message, { ...base, ...opts })
    },

    intro(title?: string): void {
      clack.intro(title, base)
    },

    message(message: string, opts?: LogMessageOptions): void {
      clack.log.message(message, { ...base, ...opts })
    },

    newline(): void {
      output.write('\n')
    },

    note(message?: string, title?: string, opts?: NoteOptions): void {
      clack.note(message, title, { ...base, ...opts })
    },

    box(message: string, title?: string, opts?: BoxOptions): void {
      clack.box(message, title, { ...boxBase, ...opts })
    },

    outro(message?: string): void {
      clack.outro(message, base)
    },

    raw(text: string): void {
      output.write(`${text}\n`)
    },

    step(message: string, opts?: LogMessageOptions): void {
      clack.log.step(message, { ...base, ...opts })
    },

    success(message: string, opts?: LogMessageOptions): void {
      clack.log.success(message, { ...base, ...opts })
    },

    warn(message: string, opts?: LogMessageOptions): void {
      clack.log.warn(message, { ...base, ...opts })
    },

    stream: createStreamLog(),
  }) satisfies Log
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the output stream from options, defaulting to `process.stderr`.
 *
 * @private
 * @param options - Optional configuration containing an output stream.
 * @returns The resolved writable stream.
 */
function resolveOutput(options: CreateLogOptions | undefined): NodeJS.WritableStream {
  if (options !== undefined && options.output !== undefined) {
    return options.output
  }
  return process.stderr
}

/**
 * Resolve the base options object from log defaults.
 *
 * Maps `guide` to clack's `withGuide` property.
 *
 * @private
 * @param defaults - The log defaults, if any.
 * @returns A plain object suitable for spreading into clack calls.
 */
function resolveBase(defaults: LogDefaults | undefined): {
  readonly withGuide?: boolean
  readonly output?: Writable
} {
  if (defaults === undefined) {
    return {}
  }
  return {
    withGuide: defaults.guide,
    output: defaults.output,
  }
}

/**
 * Resolve the base options for box calls by merging common defaults with box-specific defaults.
 *
 * @private
 * @param base - Common clack defaults (withGuide, output).
 * @param boxDefaults - Box-specific display config defaults.
 * @returns A merged object suitable for spreading into `clack.box()` calls.
 */
function resolveBoxBase(
  base: { readonly withGuide?: boolean; readonly output?: Writable },
  boxDefaults: DisplayConfig['box'] | undefined
): Record<string, unknown> {
  if (boxDefaults === undefined) {
    return base
  }
  return { ...base, ...boxDefaults }
}

/**
 * Create the streaming log methods that delegate to `@clack/prompts` stream API.
 *
 * Note: clack's stream methods (except `message`) do not accept per-call options,
 * so display defaults are not passed here.
 *
 * @private
 * @returns A frozen StreamLog object.
 */
function createStreamLog(): StreamLog {
  return Object.freeze({
    async info(iterable: AsyncIterable<string>): Promise<void> {
      await clack.stream.info(iterable)
    },
    async success(iterable: AsyncIterable<string>): Promise<void> {
      await clack.stream.success(iterable)
    },
    async error(iterable: AsyncIterable<string>): Promise<void> {
      await clack.stream.error(iterable)
    },
    async warn(iterable: AsyncIterable<string>): Promise<void> {
      await clack.stream.warn(iterable)
    },
    async step(iterable: AsyncIterable<string>): Promise<void> {
      await clack.stream.step(iterable)
    },
    async message(iterable: AsyncIterable<string>): Promise<void> {
      await clack.stream.message(iterable)
    },
  }) satisfies StreamLog
}
