/**
 * Nerd Font detection using the `font-list` package.
 *
 * Queries the system font catalog and checks whether any installed
 * font family name contains "Nerd".
 *
 * @module
 */

import { attemptAsync } from '@kidd-cli/utils/fp'
import { getFonts } from 'font-list'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect whether Nerd Fonts are installed on the system.
 *
 * Uses the `font-list` package to query installed font families and
 * checks for any family name containing "Nerd".
 *
 * @returns A promise that resolves to true when at least one Nerd Font is found.
 */
export async function detectNerdFonts(): Promise<boolean> {
  const [error, fonts] = await attemptAsync(() => getFonts({ disableQuoting: true }))

  if (error || fonts === null) {
    return false
  }

  return fonts.some((font) => /nerd/i.test(font))
}
