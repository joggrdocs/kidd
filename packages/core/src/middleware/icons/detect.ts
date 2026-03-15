/**
 * Nerd Font detection using the `font-list` package.
 *
 * Queries the system font catalog and checks whether any installed
 * font family name contains "Nerd". Results are cached so repeated
 * calls are free.
 *
 * @module
 */

import { attemptAsync } from '@kidd-cli/utils/fp'
import { getFonts } from 'font-list'

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

const cache: { value: boolean | undefined } = { value: undefined }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect whether Nerd Fonts are installed on the system.
 *
 * Uses the `font-list` package to query installed font families and
 * checks for any family name containing "Nerd". Results are cached
 * so repeated calls are free.
 *
 * @returns A promise that resolves to true when at least one Nerd Font is found.
 */
export async function detectNerdFonts(): Promise<boolean> {
  if (cache.value !== undefined) {
    return cache.value
  }

  const result = await queryFonts()
  cache.value = result
  return result
}

/**
 * Clear the detection cache. Primarily used in tests.
 */
export function clearDetectionCache(): void {
  cache.value = undefined
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Query the system font catalog for Nerd Fonts.
 *
 * @private
 * @returns A promise that resolves to true when at least one Nerd Font is found.
 */
async function queryFonts(): Promise<boolean> {
  const [error, fonts] = await attemptAsync(() => getFonts({ disableQuoting: true }))

  if (error || fonts === null) {
    return false
  }

  return fonts.some((font) => /nerd/i.test(font))
}
