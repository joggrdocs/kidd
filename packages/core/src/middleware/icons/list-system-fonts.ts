import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import type { AsyncResult } from '@kidd-cli/utils/fp'
import { attemptAsync, err, ok } from '@kidd-cli/utils/fp'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const execAsync = promisify(exec)

/**
 * Timeout (ms) for font-listing shell commands.
 *
 * @private
 */
const FONT_CMD_TIMEOUT_MS = 15_000

/**
 * Maximum stdout buffer size (bytes) for font-listing shell commands.
 *
 * @private
 */
const FONT_CMD_MAX_BUFFER = 10 * 1024 * 1024

/**
 * Regex to extract the font family name from a macOS `system_profiler` "Family:" line.
 *
 * @private
 */
const DARWIN_FAMILY_RE = /^\s+Family:\s*(.+)/

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List installed system font family names using platform-native commands.
 *
 * Uses shell commands instead of native Node.js addons to ensure
 * compatibility with bundlers (tsdown/rolldown) and compiled binaries (SEA).
 *
 * - **macOS**: Parses `system_profiler SPFontsDataType` output.
 * - **Linux**: Parses `fc-list : family` output.
 * - **Windows**: Queries fonts via PowerShell and .NET `InstalledFontCollection`.
 *
 * Returns an empty array on unsupported platforms. Propagates errors from
 * the underlying shell command as a Result tuple.
 *
 * @returns A Result tuple with font family names on success, or an Error on failure.
 */
export async function listSystemFonts(): AsyncResult<readonly string[]> {
  return match(process.platform)
    .with('darwin', () =>
      runFontCommand({
        command: 'system_profiler SPFontsDataType',
        parseLine: parseDarwinLine,
      })
    )
    .with('linux', () =>
      runFontCommand({
        command: 'fc-list : family',
        parseLine: trimLine,
      })
    )
    .with('win32', () =>
      runFontCommand({
        command: buildPowerShellCommand(),
        parseLine: trimLine,
      })
    )
    .otherwise(() => Promise.resolve(ok([] as readonly string[])))
}

// ---------------------------------------------------------------------------
// Private types
// ---------------------------------------------------------------------------

/**
 * Parameters for {@link runFontCommand}.
 *
 * @private
 */
interface RunFontCommandParams {
  readonly command: string
  readonly parseLine: (line: string) => string
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Execute a shell command and parse its stdout into font family names.
 *
 * Runs the given command, splits stdout by newlines, applies a per-line
 * parser, and filters out empty results. Propagates errors from the
 * shell command as a Result tuple.
 *
 * @private
 * @param params - The command to run and a line-parsing function.
 * @returns A Result tuple with parsed font family names on success, or an Error on failure.
 */
async function runFontCommand(params: RunFontCommandParams): AsyncResult<readonly string[]> {
  const [error, result] = await attemptAsync(() =>
    execAsync(params.command, {
      timeout: FONT_CMD_TIMEOUT_MS,
      maxBuffer: FONT_CMD_MAX_BUFFER,
    })
  )

  if (error) {
    return err(error)
  }

  if (result === null) {
    return err(new Error(`Font command returned no output: ${params.command}`))
  }

  const fonts = result.stdout
    .split('\n')
    .map(params.parseLine)
    .filter((name) => name.length > 0)

  return ok(fonts)
}

/**
 * Parse a macOS `system_profiler` line, extracting the family name.
 *
 * Returns the family name from lines matching `"  Family: <name>"`,
 * or an empty string for non-matching lines (filtered out by the caller).
 *
 * @private
 * @param line - A single line from system_profiler output.
 * @returns The font family name, or empty string if not a Family line.
 */
function parseDarwinLine(line: string): string {
  const m = DARWIN_FAMILY_RE.exec(line)

  if (m === null) {
    return ''
  }

  const [, family] = m

  if (family === undefined) {
    return ''
  }

  return family.trim()
}

/**
 * Trim whitespace from a line (used by Linux and Windows parsers).
 *
 * @private
 * @param line - A single stdout line.
 * @returns The trimmed line.
 */
function trimLine(line: string): string {
  return line.trim()
}

/**
 * Build the static PowerShell command to list installed font families.
 *
 * @private
 * @returns The full PowerShell command string.
 */
function buildPowerShellCommand(): string {
  return [
    'powershell',
    '-NoProfile',
    '-Command',
    '"Add-Type -AssemblyName System.Drawing;',
    '(New-Object System.Drawing.Text.InstalledFontCollection).Families',
    '| ForEach-Object { $_.Name }"',
  ].join(' ')
}
