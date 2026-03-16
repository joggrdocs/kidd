/**
 * Nerd Font detection using platform-native font listing.
 *
 * Queries the system font catalog and checks whether any installed
 * font family name contains "Nerd".
 *
 * @module
 */

import { listSystemFonts } from './list-system-fonts.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect whether Nerd Fonts are installed on the system.
 *
 * Uses platform-native commands to query installed font families and
 * checks for any family name containing "Nerd". Returns `false` when
 * font listing fails.
 *
 * @returns A promise that resolves to true when at least one Nerd Font is found.
 */
export async function detectNerdFonts(): Promise<boolean> {
  const [error, fonts] = await listSystemFonts()

  if (error) {
    return false
  }

  return fonts.some((font) => /nerd/i.test(font))
}
