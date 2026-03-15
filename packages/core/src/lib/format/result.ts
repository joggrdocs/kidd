import pc from 'picocolors'
import { match } from 'ts-pattern'

import { SYMBOLS } from './constants.js'
import type { ResultInput } from './types.js'

/**
 * Format a single pass/fail/warn result row.
 *
 * @param input - The result data to format.
 * @returns A formatted result string.
 */
export function formatResult(input: ResultInput): string {
  const icon = match(input.status)
    .with('pass', () => pc.green(SYMBOLS.check))
    .with('fail', () => pc.red(SYMBOLS.cross))
    .with('warn', () => pc.yellow(SYMBOLS.warning))
    .with('skip', () => pc.gray(SYMBOLS.skip))
    .with('fix', () => pc.blue(SYMBOLS.fix))
    .exhaustive()

  const nameText = match(input.status)
    .with('fail', () => pc.red(input.name))
    .with('warn', () => pc.yellow(input.name))
    .with('skip', () => pc.gray(input.name))
    .otherwise(() => input.name)

  const detailText = formatOptionalDetail(input.detail)
  const durationText = formatOptionalDuration(input.duration)
  const hintText = formatOptionalHint(input.hint)

  return ` ${icon} ${nameText}${detailText}${durationText}${hintText}`
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format optional detail text.
 *
 * @private
 * @param detail - Optional detail string.
 * @returns Formatted detail or empty string.
 */
function formatOptionalDetail(detail: string | undefined): string {
  return match(detail)
    .with(undefined, () => '')
    .otherwise((d) => ` ${pc.gray(d)}`)
}

/**
 * Format optional duration for a result row.
 *
 * @private
 * @param duration - Optional duration in milliseconds.
 * @returns Formatted duration or empty string.
 */
function formatOptionalDuration(duration: number | undefined): string {
  return match(duration)
    .with(undefined, () => '')
    .otherwise((d) => ` ${pc.gray(`(${formatDurationInline(d)})`)}`)
}

/**
 * Format optional hint text.
 *
 * @private
 * @param hint - Optional hint string.
 * @returns Formatted hint or empty string.
 */
function formatOptionalHint(hint: string | undefined): string {
  return match(hint)
    .with(undefined, () => '')
    .otherwise((h) => ` ${pc.dim(`[${h}]`)}`)
}

/**
 * Inline duration format for result rows (compact).
 *
 * @private
 * @param ms - Duration in milliseconds.
 * @returns A compact formatted duration string.
 */
function formatDurationInline(ms: number): string {
  return match(ms)
    .when(
      (v) => v < 1,
      () => '< 1ms'
    )
    .when(
      (v) => v < 1000,
      (v) => `${Math.round(v)}ms`
    )
    .otherwise((v) => `${(v / 1000).toFixed(2)}s`)
}
