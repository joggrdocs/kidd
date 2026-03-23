/**
 * Types for the logger middleware.
 *
 * @module
 */

import type {
  ConfirmOptions,
  MultiSelectOptions,
  SelectOptions,
  TextOptions,
} from '@/context/types.js'

export type {
  ConfirmOptions,
  MultiSelectOptions,
  SelectOption,
  SelectOptions,
  TextOptions,
} from '@/context/types.js'

// ---------------------------------------------------------------------------
// Log Spinner
// ---------------------------------------------------------------------------

/**
 * A running spinner that can be stopped or have its message updated.
 */
export interface LogSpinner {
  /**
   * Stop the spinner with an optional final message.
   */
  readonly stop: (message?: string) => void
  /**
   * Update the spinner's displayed message.
   */
  readonly message: (message: string) => void
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

/**
 * Unified logging, prompting, and spinner API surface.
 *
 * Provides structured terminal output via `@clack/prompts`, interactive
 * prompts with cancel-signal unwrapping, and spinner management.
 */
export interface Log {
  /**
   * Log an informational message.
   */
  readonly info: (message: string) => void
  /**
   * Log a success message.
   */
  readonly success: (message: string) => void
  /**
   * Log an error message.
   */
  readonly error: (message: string) => void
  /**
   * Log a warning message.
   */
  readonly warn: (message: string) => void
  /**
   * Log a step indicator message.
   */
  readonly step: (message: string) => void
  /**
   * Log a message with an optional custom symbol prefix.
   */
  readonly message: (message: string, opts?: { readonly symbol?: string }) => void
  /**
   * Print an intro banner with an optional title.
   */
  readonly intro: (title?: string) => void
  /**
   * Print an outro banner with an optional closing message.
   */
  readonly outro: (message?: string) => void
  /**
   * Display a boxed note with an optional title.
   */
  readonly note: (message?: string, title?: string) => void
  /**
   * Write a blank line to the output stream.
   */
  readonly newline: () => void
  /**
   * Write raw text followed by a newline to the output stream.
   */
  readonly raw: (text: string) => void
  /**
   * Create and start a spinner with an optional initial message.
   */
  readonly spinner: (message?: string) => LogSpinner
  /**
   * Prompt the user for a yes/no confirmation.
   */
  readonly confirm: (opts: ConfirmOptions) => Promise<boolean>
  /**
   * Prompt the user for free-text input.
   */
  readonly text: (opts: TextOptions) => Promise<string>
  /**
   * Prompt the user for a password (masked input).
   */
  readonly password: (opts: TextOptions) => Promise<string>
  /**
   * Prompt the user to select a single option.
   */
  readonly select: <T>(opts: SelectOptions<T>) => Promise<T>
  /**
   * Prompt the user to select multiple options.
   */
  readonly multiselect: <T>(opts: MultiSelectOptions<T>) => Promise<T[]>
}

// ---------------------------------------------------------------------------
// Logger Options
// ---------------------------------------------------------------------------

/**
 * Configuration options for the {@link logger} middleware factory.
 */
export interface LoggerOptions {
  /**
   * When true, enables the clack guide display.
   */
  readonly withGuide?: boolean
  /**
   * Writable stream for raw output methods. Defaults to `process.stderr`.
   */
  readonly output?: NodeJS.WritableStream
  /**
   * Override with a custom Log implementation (useful for testing).
   */
  readonly log?: Log
}

// ---------------------------------------------------------------------------
// Logger Env
// ---------------------------------------------------------------------------

/**
 * Middleware environment descriptor for the logger middleware.
 *
 * Declares that `ctx.log` will be available after this middleware runs.
 */
export interface LoggerEnv {
  readonly Variables: {
    readonly log: Log
  }
}
