/**
 * Platform-native system font listing.
 *
 * Queries installed font families using shell commands instead of
 * native Node.js addons, ensuring compatibility with bundlers
 * (tsdown/rolldown) and compiled binaries (SEA).
 *
 * @module
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import { attemptAsync } from '@kidd-cli/utils/fp'
import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const execAsync = promisify(exec)

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
 * - **macOS**: Parses `system_profiler SPFontsDataType` output.
 * - **Linux**: Parses `fc-list : family` output.
 * - **Windows**: Queries fonts via PowerShell and .NET `InstalledFontCollection`.
 *
 * Returns an empty array on unsupported platforms or when the system
 * command fails.
 *
 * @returns A promise resolving to an array of font family names.
 */
export async function listSystemFonts(): Promise<readonly string[]> {
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
    .otherwise(() => Promise.resolve([]))
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
 * parser, and filters out empty results. Returns an empty array when the
 * command fails.
 *
 * @private
 * @param params - The command to run and a line-parsing function.
 * @returns Parsed font family names.
 */
async function runFontCommand(params: RunFontCommandParams): Promise<readonly string[]> {
  const [error, result] = await attemptAsync(() => execAsync(params.command))

  if (error || result === null) {
    return []
  }

  return result.stdout
    .split('\n')
    .map(params.parseLine)
    .filter((name) => name.length > 0)
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

  const family = m[1]

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
