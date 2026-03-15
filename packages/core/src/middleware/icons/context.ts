/**
 * Factory for the {@link IconsContext} object decorated onto `ctx.icons`.
 *
 * Builds a callable object that resolves icon names to glyphs based on
 * whether Nerd Fonts are detected on the system.
 *
 * @module
 */

import type { AsyncResult } from '@kidd-cli/utils/fp'
import { match } from 'ts-pattern'

import type { CliLogger, Prompts, Spinner } from '@/context/types.js'

import { getIconsByCategory } from './definitions.js'
import { installNerdFont } from './install.js'
import type { IconCategory, IconDefinition, IconsContext, IconsError } from './types.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Minimal context subset needed by the icons context factory.
 */
export interface IconsCtx {
  readonly logger: CliLogger
  readonly prompts: Prompts
  readonly spinner: Spinner
}

/**
 * Options for {@link createIconsContext}.
 */
export interface CreateIconsContextOptions {
  readonly ctx: IconsCtx
  readonly icons: Readonly<Record<string, IconDefinition>>
  readonly isInstalled: boolean
  readonly font?: string
  readonly forceSetup?: boolean
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an {@link IconsContext} value for `ctx.icons`.
 *
 * The returned object is callable — `ctx.icons('branch')` resolves the
 * icon. Additional methods (`get`, `has`, `installed`, `setup`, `category`)
 * are attached via `Object.assign`.
 *
 * @param options - Factory options.
 * @returns An IconsContext instance.
 */
export function createIconsContext(options: CreateIconsContextOptions): IconsContext {
  const { ctx, icons, font, forceSetup } = options
  const state = { isInstalled: options.isInstalled }

  return Object.freeze({
    category: (cat: IconCategory): Readonly<Record<string, string>> => {
      const categoryIcons = getIconsByCategory(cat)
      return Object.freeze(
        Object.fromEntries(
          Object.entries(categoryIcons).map(([name, def]) => [
            name,
            resolveIcon(icons, name, state.isInstalled, def),
          ])
        )
      )
    },
    get: (name: string): string => resolveIcon(icons, name, state.isInstalled),
    has: (name: string): boolean => name in icons,
    installed: (): boolean => {
      if (forceSetup === true) {
        return false
      }
      return state.isInstalled
    },
    setup: async (): AsyncResult<boolean, IconsError> => {
      const [error, result] = await installNerdFont({ ctx, font })

      if (error) {
        return [error, null] as const
      }

      if (result) {
        state.isInstalled = true
      }

      return [null, result] as const
    },
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a single icon to its appropriate glyph string.
 *
 * @private
 * @param icons - The full icon definitions record.
 * @param name - The icon name to resolve.
 * @param nerdFontsInstalled - Whether Nerd Fonts are available.
 * @param fallbackDef - Optional fallback definition (used for category resolution).
 * @returns The resolved glyph string, or empty string if not found.
 */
function resolveIcon(
  icons: Readonly<Record<string, IconDefinition>>,
  name: string,
  nerdFontsInstalled: boolean,
  fallbackDef?: IconDefinition
): string {
  const def = icons[name] ?? fallbackDef
  if (def === undefined) {
    return ''
  }

  return match(nerdFontsInstalled)
    .with(true, () => def.nerdFont)
    .with(false, () => def.emoji)
    .exhaustive()
}
