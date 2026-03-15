import * as clack from '@clack/prompts'

import { formatCheck } from '@/lib/format/check.js'
import { formatFinding } from '@/lib/format/finding.js'
import { formatTally } from '@/lib/format/tally.js'
import type { CheckInput } from '@/lib/format/types.js'
import type { FindingInput } from '@/lib/format/types.js'
import type { TallyInput } from '@/lib/format/types.js'

/**
 * Options for creating a logger instance.
 */
export interface CliLoggerOptions {
  /**
   * Writable stream for raw output methods like {@link CliLogger.print} and {@link CliLogger.newline}.
   * Defaults to `process.stderr`.
   */
  readonly output?: NodeJS.WriteStream
}

/**
 * Structured logger backed by @clack/prompts for terminal UI output.
 */
export interface CliLogger {
  /**
   * Log an informational message.
   */
  info(message: string): void
  /**
   * Log a success message.
   */
  success(message: string): void
  /**
   * Log an error message.
   */
  error(message: string): void
  /**
   * Log a warning message.
   */
  warn(message: string): void
  /**
   * Log a step indicator message.
   */
  step(message: string): void
  /**
   * Log a message with an optional custom symbol prefix.
   */
  message(message: string, opts?: { symbol?: string }): void
  /**
   * Print an intro banner with an optional title.
   */
  intro(title?: string): void
  /**
   * Print an outro banner with an optional closing message.
   */
  outro(message?: string): void
  /**
   * Display a boxed note with an optional title.
   */
  note(message?: string, title?: string): void
  /**
   * Write a blank line to the output stream.
   */
  newline(): void
  /**
   * Write raw text followed by a newline to the output stream.
   */
  print(text: string): void
  /**
   * Write a single pass/fail/warn/skip/fix check row (vitest test file style).
   */
  check(input: CheckInput): void
  /**
   * Write a full finding with optional code frame (oxlint style).
   */
  finding(input: FindingInput): void
  /**
   * Write a tally block. Use `style: 'tally'` for labeled count rows
   * (vitest style) or `style: 'inline'` for a one-liner stats footer
   * (oxlint style).
   */
  tally(input: TallyInput): void
}

/**
 * Create a new {@link CliLogger} instance.
 *
 * @param options - Logger configuration.
 * @returns A CliLogger wired to the given output stream.
 */
export function createCliLogger(options: CliLoggerOptions = {}): CliLogger {
  const output = options.output ?? process.stderr

  return {
    check(input: CheckInput): void {
      output.write(`${formatCheck(input)}\n`)
    },
    error(message: string): void {
      clack.log.error(message)
    },
    finding(input: FindingInput): void {
      output.write(`${formatFinding(input)}\n\n`)
    },
    info(message: string): void {
      clack.log.info(message)
    },
    intro(title?: string): void {
      clack.intro(title)
    },
    message(message: string, opts?: { symbol?: string }): void {
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
    print(text: string): void {
      output.write(`${text}\n`)
    },
    step(message: string): void {
      clack.log.step(message)
    },
    success(message: string): void {
      clack.log.success(message)
    },
    tally(input: TallyInput): void {
      output.write(`\n${formatTally(input)}\n`)
    },
    warn(message: string): void {
      clack.log.warn(message)
    },
  }
}

/**
 * Default logger instance writing to stderr.
 */
export const cliLogger: CliLogger = createCliLogger()
