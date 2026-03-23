/**
 * Factory for creating a {@link Log} instance backed by `@clack/prompts`.
 *
 * @module
 */

import * as clack from '@clack/prompts'

import type { Log } from '@/context/types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Options for {@link createLog}.
 */
export interface CreateLogOptions {
  /**
   * Writable stream for raw output. Defaults to `process.stderr`.
   */
  readonly output?: NodeJS.WritableStream
}

/**
 * Create a {@link Log} instance that delegates to `@clack/prompts` for
 * structured terminal output.
 *
 * @param options - Optional configuration for the log instance.
 * @returns A frozen Log object.
 */
export function createLog(options?: CreateLogOptions): Log {
  const output = resolveOutput(options)

  return Object.freeze({
    error(message: string): void {
      clack.log.error(message)
    },

    info(message: string): void {
      clack.log.info(message)
    },

    intro(title?: string): void {
      clack.intro(title)
    },

    message(message: string, opts?: { readonly symbol?: string }): void {
      clack.log.message(message, opts)
    },

    newline(): void {
      output.write('\n')
    },

    note(message?: string, title?: string): void {
      clack.note(message, title)
    },

    outro(message?: string): void {
      clack.outro(message)
    },

    raw(text: string): void {
      output.write(`${text}\n`)
    },

    step(message: string): void {
      clack.log.step(message)
    },

    success(message: string): void {
      clack.log.success(message)
    },

    warn(message: string): void {
      clack.log.warn(message)
    },
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
