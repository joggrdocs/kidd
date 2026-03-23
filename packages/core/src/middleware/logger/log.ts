/**
 * Factory for creating a {@link Log} instance backed by `@clack/prompts`.
 *
 * @module
 */

import * as clack from '@clack/prompts'

import { DEFAULT_EXIT_CODE, createContextError } from '@/context/error.js'
import type {
  ConfirmOptions,
  MultiSelectOptions,
  SelectOptions,
  TextOptions,
} from '@/context/types.js'

import type { Log, LogSpinner } from './types.js'

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
 * structured terminal output and interactive prompts.
 *
 * @param options - Optional configuration for the log instance.
 * @returns A frozen Log object.
 */
export function createLog(options?: CreateLogOptions): Log {
  const output = resolveOutput(options)

  return Object.freeze({
    confirm(opts: ConfirmOptions): Promise<boolean> {
      return promiseFromPrompt(clack.confirm(opts))
    },

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

    multiselect<T>(opts: MultiSelectOptions<T>): Promise<T[]> {
      return promiseFromPrompt<T[]>(
        clack.multiselect<T>(opts as Parameters<typeof clack.multiselect<T>>[0])
      )
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

    password(opts: TextOptions): Promise<string> {
      return promiseFromPrompt(clack.password(opts))
    },

    raw(text: string): void {
      output.write(`${text}\n`)
    },

    select<T>(opts: SelectOptions<T>): Promise<T> {
      return promiseFromPrompt<T>(clack.select<T>(opts as Parameters<typeof clack.select<T>>[0]))
    },

    spinner(message?: string): LogSpinner {
      const s = clack.spinner()
      s.start(message)
      return Object.freeze({
        message: s.message,
        stop: s.stop,
      })
    },

    step(message: string): void {
      clack.log.step(message)
    },

    success(message: string): void {
      clack.log.success(message)
    },

    text(opts: TextOptions): Promise<string> {
      return promiseFromPrompt(clack.text(opts))
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

/**
 * Unwrap a clack prompt result, converting cancel signals to ContextErrors.
 *
 * @private
 * @param promise - The raw promise from a clack prompt call.
 * @returns The unwrapped typed value.
 */
async function promiseFromPrompt<T>(promise: Promise<T | symbol>): Promise<T> {
  const result = await promise
  return unwrapCancelSignal<T>(result)
}

/**
 * Unwrap a prompt result that may be a cancel symbol.
 *
 * If the user cancelled (Ctrl-C), throws a ContextError. Otherwise returns
 * the typed result value.
 *
 * @private
 * @param result - The raw prompt result (value or cancel symbol).
 * @returns The unwrapped typed value.
 */
function unwrapCancelSignal<T>(result: T | symbol): T {
  if (clack.isCancel(result)) {
    clack.cancel('Operation cancelled.')
    // Accepted exception: prompt cancellation must propagate as an unwind.
    // The runner catches the thrown ContextError at the CLI boundary.
    throw createContextError('Prompt cancelled by user', {
      code: 'PROMPT_CANCELLED',
      exitCode: DEFAULT_EXIT_CODE,
    })
  }
  return result as T
}
