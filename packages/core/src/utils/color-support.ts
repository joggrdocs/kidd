import { release } from 'node:os'

import { match } from 'ts-pattern'

/**
 * Regex matching TERM values that indicate 256-color support.
 */
const COLOR_256_PATTERN = /-256(color)?$/i

/**
 * Regex matching TERM values that indicate basic ANSI color support.
 */
const BASIC_TERM_PATTERN = /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i

/**
 * Color support level for a terminal stream.
 *
 * - `0` — No color support
 * - `1` — Basic 16-color ANSI support
 * - `2` — 256-color support
 * - `3` — 16 million color (truecolor / 24-bit) support
 */
export type ColorLevel = 0 | 1 | 2 | 3

/**
 * Describes the color capabilities of a terminal stream.
 */
export interface ColorSupport {
  /**
   * Whether 16 million (truecolor / 24-bit) colors are supported.
   */
  readonly has16m: boolean
  /**
   * Whether 256-color mode is supported.
   */
  readonly has256: boolean
  /**
   * Whether basic 16-color ANSI is supported.
   */
  readonly hasBasic: boolean
  /**
   * The detected color support level.
   */
  readonly level: ColorLevel
}

/**
 * Minimal interface for a writable stream that may be a TTY.
 */
export interface ColorStream {
  /**
   * Whether the stream is connected to a TTY device.
   */
  readonly isTTY?: boolean
}

/**
 * Detect the color support level of a terminal stream.
 *
 * Respects the `NO_COLOR` and `FORCE_COLOR` environment variables per the
 * community standards. Handles Windows (build-level detection), macOS, Linux,
 * and CI environments.
 *
 * @param stream - A writable stream to test for TTY and color support.
 * @returns The color support capabilities of the stream.
 *
 * @see https://no-color.org
 * @see https://force-color.org
 */
export function supportsColor(stream: ColorStream): ColorSupport {
  const forced = parseForceColor()
  if (forced !== null) {
    return createColorSupport(forced)
  }

  if ('NO_COLOR' in process.env) {
    return createColorSupport(0)
  }

  if (stream.isTTY !== true && 'CI' in process.env) {
    return createColorSupport(1)
  }

  if (stream.isTTY !== true) {
    return createColorSupport(0)
  }

  if (process.env.TERM === 'dumb') {
    return createColorSupport(0)
  }

  if (process.platform === 'win32') {
    return createColorSupport(detectWindowsLevel())
  }

  return createColorSupport(detectTermLevel())
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Create a frozen {@link ColorSupport} descriptor from a numeric level.
 *
 * @param level - The resolved color level.
 * @returns An immutable ColorSupport object.
 * @private
 */
function createColorSupport(level: ColorLevel): ColorSupport {
  return Object.freeze({
    has16m: level >= 3,
    has256: level >= 2,
    hasBasic: level >= 1,
    level,
  })
}

/**
 * Parse the `FORCE_COLOR` environment variable into a color level.
 *
 * Returns `null` when the variable is not set, allowing the caller
 * to fall through to automatic detection.
 *
 * @returns The forced color level, or `null` if `FORCE_COLOR` is not set.
 * @private
 */
function parseForceColor(): ColorLevel | null {
  if (!('FORCE_COLOR' in process.env)) {
    return null
  }

  return match(process.env.FORCE_COLOR)
    .with('0', (): ColorLevel => 0)
    .with('false', (): ColorLevel => 0)
    .with('2', (): ColorLevel => 2)
    .with('3', (): ColorLevel => 3)
    .otherwise((): ColorLevel => 1)
}

/**
 * Detect color level on Windows based on OS build number.
 *
 * Windows 10 build 14931+ supports truecolor.
 * Windows 10 build 10586+ supports 256 colors.
 * Earlier versions get basic color support.
 *
 * @returns The detected color level for the current Windows version.
 * @private
 */
function detectWindowsLevel(): ColorLevel {
  const parts = release().split('.')

  if (parts.length < 3) {
    return 1
  }

  const major = Number(parts[0])
  const build = Number(parts[2])

  if (Number.isNaN(major) || Number.isNaN(build) || major < 10) {
    return 1
  }

  if (build >= 14_931) {
    return 3
  }

  if (build >= 10_586) {
    return 2
  }

  return 1
}

/**
 * Detect color level from terminal-related environment variables.
 *
 * Checks `COLORTERM`, `TERM_PROGRAM`, and `TERM` in priority order.
 *
 * @returns The detected color level.
 * @private
 */
function detectTermLevel(): ColorLevel {
  const colorterm = process.env.COLORTERM

  if (colorterm === 'truecolor' || colorterm === '24bit') {
    return 3
  }

  const termProgramLevel = detectTermProgramLevel()
  if (termProgramLevel !== null) {
    return termProgramLevel
  }

  return detectTermVariableLevel(colorterm)
}

/**
 * Detect color level from the `TERM_PROGRAM` environment variable.
 *
 * @returns The color level inferred from the terminal program, or `null`
 *   when the variable is absent or unrecognized.
 * @private
 */
function detectTermProgramLevel(): ColorLevel | null {
  return match(process.env.TERM_PROGRAM)
    .with('iTerm.app', () => detectITermLevel())
    .with('Apple_Terminal', (): ColorLevel => 2)
    .otherwise(() => null)
}

/**
 * Detect color level for iTerm.app based on the program version.
 *
 * iTerm2 version 3+ supports truecolor; earlier versions support 256.
 *
 * @returns The detected color level for iTerm.
 * @private
 */
function detectITermLevel(): ColorLevel {
  const version = process.env.TERM_PROGRAM_VERSION

  if (version === undefined) {
    return 2
  }

  const major = Number(version.split('.')[0])

  if (Number.isNaN(major) || major < 3) {
    return 2
  }

  return 3
}

/**
 * Detect color level from the `TERM` environment variable.
 *
 * @param colorterm - The value of `COLORTERM`, used as a fallback signal.
 * @returns The detected color level.
 * @private
 */
function detectTermVariableLevel(colorterm: string | undefined): ColorLevel {
  const term = process.env.TERM

  if (term === undefined && colorterm !== undefined) {
    return 1
  }

  if (term === undefined) {
    return 0
  }

  if (COLOR_256_PATTERN.test(term)) {
    return 2
  }

  if (BASIC_TERM_PATTERN.test(term)) {
    return 1
  }

  if (colorterm !== undefined) {
    return 1
  }

  return 0
}
