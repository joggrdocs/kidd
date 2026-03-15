/**
 * Nerd Font installation for macOS and Linux.
 *
 * Detects installed system fonts, matches them to available Nerd Font
 * equivalents, and lets the user choose which to install. Supports
 * Homebrew on macOS and direct download on Linux.
 *
 * All shell commands run asynchronously so the spinner can animate
 * and ctrl+c remains responsive.
 *
 * @module
 */

import { exec } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import type { AsyncResult } from '@kidd-cli/utils/fp'
import { ok } from '@kidd-cli/utils/fp'
import { getFonts } from 'font-list'
import { match } from 'ts-pattern'

import type { IconsCtx } from './context.js'
import type { IconsError } from './types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const execAsync = promisify(exec)

/**
 * Maps base font family name patterns to their Nerd Font release names.
 *
 * Keys are lowercase patterns matched against installed font names.
 * Values are the exact release archive names on GitHub.
 *
 * @private
 */
const FONT_MAP: ReadonlyArray<readonly [string, string]> = Object.freeze([
  ['jetbrains mono', 'JetBrainsMono'],
  ['fira code', 'FiraCode'],
  ['fira mono', 'FiraMono'],
  ['cascadia code', 'CascadiaCode'],
  ['cascadia mono', 'CascadiaMono'],
  ['hack', 'Hack'],
  ['source code pro', 'SourceCodePro'],
  ['meslo', 'Meslo'],
  ['inconsolata', 'Inconsolata'],
  ['dejavu sans mono', 'DejaVuSansMono'],
  ['droid sans mono', 'DroidSansMono'],
  ['ubuntu mono', 'UbuntuMono'],
  ['ubuntu sans', 'UbuntuSans'],
  ['roboto mono', 'RobotoMono'],
  ['ibm plex mono', 'IBMPlexMono'],
  ['victor mono', 'VictorMono'],
  ['iosevka', 'Iosevka'],
  ['mononoki', 'Mononoki'],
  ['geist mono', 'GeistMono'],
  ['space mono', 'SpaceMono'],
  ['anonymous pro', 'AnonymousPro'],
  ['overpass', 'Overpass'],
  ['go mono', 'Go-Mono'],
  ['noto', 'Noto'],
  ['commit mono', 'CommitMono'],
  ['monaspace', 'Monaspace'],
  ['intel one mono', 'IntelOneMono'],
  ['zed mono', 'ZedMono'],
  ['comic shanns', 'ComicShannsMono'],
  ['lilex', 'Lilex'],
  ['recursive', 'Recursive'],
  ['hermit', 'Hermit'],
  ['hasklig', 'Hasklig'],
  ['martian mono', 'MartianMono'],
  ['0xproto', '0xProto'],
  ['departure mono', 'DepartureMono'],
  ['atkinson hyperlegible', 'AtkinsonHyperlegibleMono'],
])

/**
 * Popular Nerd Fonts shown as fallback options when no matches are found.
 *
 * @private
 */
const POPULAR_FONTS: ReadonlyArray<string> = Object.freeze([
  'JetBrainsMono',
  'FiraCode',
  'Hack',
  'CascadiaCode',
  'Meslo',
  'SourceCodePro',
  'Iosevka',
  'VictorMono',
])

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Options for {@link installNerdFont}.
 */
export interface InstallFontOptions {
  readonly ctx: IconsCtx
  readonly font?: string
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Interactively install a Nerd Font on the user's system.
 *
 * Detects installed system fonts, matches them against available Nerd Font
 * equivalents, and presents a selection prompt. If a `font` option is
 * provided, skips detection and installs that font directly after confirmation.
 *
 * @param options - Installation options including context and font name.
 * @returns A Result with true on success or an IconsError on failure.
 */
export async function installNerdFont(
  options: InstallFontOptions
): AsyncResult<boolean, IconsError> {
  const { ctx, font } = options

  if (font !== undefined) {
    return installWithConfirmation(ctx, font)
  }

  return installWithSelection(ctx)
}

// ---------------------------------------------------------------------------
// Private helpers — selection flow
// ---------------------------------------------------------------------------

/**
 * Run the font selection flow: detect installed fonts, match to Nerd Fonts,
 * and let the user pick.
 *
 * @private
 * @param ctx - The icons context with prompts, spinner, and logger.
 * @returns A Result with true on success or an IconsError on failure.
 */
async function installWithSelection(ctx: IconsCtx): AsyncResult<boolean, IconsError> {
  ctx.spinner.start('Detecting installed fonts...')
  const matches = await detectMatchingFonts()
  ctx.spinner.stop('Font detection complete')

  const choices = buildFontChoices(matches)

  const selected = await ctx.prompts.select({
    message: 'Select a Nerd Font to install',
    options: choices,
  })

  if (selected === undefined) {
    return ok(false)
  }

  const fontName = String(selected)

  const action = await ctx.prompts.select({
    message: 'How would you like to install?',
    options: [
      { label: 'Auto install', value: 'auto' },
      { label: 'Show install commands', value: 'commands' },
    ],
  })

  if (action === undefined) {
    return ok(false)
  }

  return match(String(action))
    .with('auto', () => installFontWithSpinner(ctx, fontName))
    .with('commands', () => showInstallCommands(ctx, fontName))
    .otherwise(() => ok(false))
}

/**
 * Confirm and install a specific font by name.
 *
 * @private
 * @param ctx - The icons context with prompts, spinner, and logger.
 * @param fontName - The Nerd Font release name to install.
 * @returns A Result with true on success or an IconsError on failure.
 */
async function installWithConfirmation(
  ctx: IconsCtx,
  fontName: string
): AsyncResult<boolean, IconsError> {
  const confirmed = await ctx.prompts.confirm({
    message: `Nerd Fonts not detected. Install ${fontName} Nerd Font?`,
  })

  if (!confirmed) {
    return ok(false)
  }

  return installFontWithSpinner(ctx, fontName)
}

/**
 * Detect system fonts and match them to available Nerd Font equivalents.
 *
 * @private
 * @returns An array of matched Nerd Font release names.
 */
async function detectMatchingFonts(): Promise<ReadonlyArray<string>> {
  try {
    const systemFonts = await getFonts({ disableQuoting: true })
    const lowerFonts = systemFonts.map((f) => f.toLowerCase())

    return FONT_MAP.filter(([pattern]) => lowerFonts.some((f) => f.includes(pattern))).map(
      ([, nerdName]) => nerdName
    )
  } catch {
    return []
  }
}

/**
 * Build the select prompt choices from matched and popular fonts.
 *
 * Matched fonts (based on what's installed) appear first with a hint,
 * followed by popular alternatives that weren't already matched.
 *
 * @private
 * @param matches - Nerd Font names matched from installed system fonts.
 * @returns An array of select options.
 */
function buildFontChoices(
  matches: ReadonlyArray<string>
): Array<{ value: string; label: string; hint?: string }> {
  const matchedSet = new Set(matches)

  const matchedChoices = matches.map((name) => ({
    hint: 'detected on your system',
    label: `${name} Nerd Font`,
    value: name,
  }))

  const popularChoices = POPULAR_FONTS.filter((name) => !matchedSet.has(name)).map((name) => ({
    label: `${name} Nerd Font`,
    value: name,
  }))

  return [...matchedChoices, ...popularChoices]
}

// ---------------------------------------------------------------------------
// Private helpers — installation
// ---------------------------------------------------------------------------

/**
 * Print the install commands for the user to run manually.
 *
 * @private
 * @param ctx - The icons context with logger.
 * @param fontName - The Nerd Font release name (e.g. 'JetBrainsMono').
 * @returns A Result with false since nothing was installed.
 */
async function showInstallCommands(
  ctx: IconsCtx,
  fontName: string
): AsyncResult<boolean, IconsError> {
  const slug = fontNameToSlug(fontName)
  const url = `https://github.com/ryanoasis/nerd-fonts/releases/latest/download/${fontName}.zip`
  const fontDir = match(process.platform)
    .with('darwin', () => join(homedir(), 'Library', 'Fonts'))
    .otherwise(() => join(homedir(), '.local', 'share', 'fonts'))

  const hasBrew = await checkBrewAvailable()

  const lines: ReadonlyArray<string> = match(process.platform)
    .with('darwin', () =>
      match(hasBrew)
        .with(true, () => [
          '',
          'Run the following command to install via Homebrew:',
          '',
          `  brew install --cask font-${slug}-nerd-font`,
          '',
        ])
        .with(false, () => [
          '',
          'Run the following commands to install manually:',
          '',
          `  curl -fsSL -o "${fontDir}/${fontName}.zip" "${url}"`,
          `  unzip -o "${fontDir}/${fontName}.zip" -d "${fontDir}"`,
          `  rm -f "${fontDir}/${fontName}.zip"`,
          '',
        ])
        .exhaustive()
    )
    .with('linux', () => [
      '',
      'Run the following commands to install:',
      '',
      `  mkdir -p "${fontDir}"`,
      `  curl -fsSL -o "${fontDir}/${fontName}.zip" "${url}"`,
      `  unzip -o "${fontDir}/${fontName}.zip" -d "${fontDir}"`,
      `  rm -f "${fontDir}/${fontName}.zip"`,
      '  fc-cache -fv',
      '',
    ])
    .otherwise(() => ['', `Download the font from: ${url}`, ''])

  lines.map((line) => ctx.logger.info(line))

  return ok(false)
}

/**
 * Install a Nerd Font with spinner feedback.
 *
 * @private
 * @param ctx - The icons context with spinner.
 * @param fontName - The Nerd Font release name (e.g. 'JetBrainsMono').
 * @returns A Result with true on success or an IconsError on failure.
 */
async function installFontWithSpinner(
  ctx: IconsCtx,
  fontName: string
): AsyncResult<boolean, IconsError> {
  ctx.spinner.start(`Installing ${fontName} Nerd Font...`)

  const result = await installFont(ctx, fontName)
  const [error] = result

  if (error) {
    ctx.spinner.stop(`Failed to install ${fontName} Nerd Font`)
    return result
  }

  ctx.spinner.stop(`${fontName} Nerd Font installed successfully`)
  return result
}

/**
 * Install a Nerd Font by name, dispatching to the platform-appropriate method.
 *
 * @private
 * @param ctx - The icons context with spinner.
 * @param fontName - The Nerd Font release name (e.g. 'JetBrainsMono').
 * @returns A Result with true on success or an IconsError on failure.
 */
async function installFont(ctx: IconsCtx, fontName: string): AsyncResult<boolean, IconsError> {
  return match(process.platform)
    .with('darwin', () => installDarwin(ctx, fontName))
    .with('linux', () => installLinux(ctx, fontName))
    .otherwise(() =>
      Promise.resolve(
        iconsError({ message: `Unsupported platform: ${process.platform}`, type: 'install_failed' })
      )
    )
}

/**
 * Install a Nerd Font on macOS via Homebrew or direct download.
 *
 * @private
 * @param ctx - The icons context with spinner.
 * @param fontName - The font family name (e.g. 'JetBrainsMono').
 * @returns A Result with true on success or an IconsError on failure.
 */
async function installDarwin(ctx: IconsCtx, fontName: string): AsyncResult<boolean, IconsError> {
  const slug = fontNameToSlug(fontName)
  const hasBrew = await checkBrewAvailable()

  if (hasBrew) {
    return installViaBrew(ctx, slug)
  }

  return installViaDownload(ctx, fontName)
}

/**
 * Install a Nerd Font on Linux via direct download.
 *
 * @private
 * @param ctx - The icons context with spinner.
 * @param fontName - The font family name (e.g. 'JetBrainsMono').
 * @returns A Result with true on success or an IconsError on failure.
 */
async function installLinux(ctx: IconsCtx, fontName: string): AsyncResult<boolean, IconsError> {
  return installViaDownload(ctx, fontName)
}

/**
 * Check whether Homebrew is available on the system.
 *
 * @private
 * @returns A promise resolving to true when the `brew` command is found.
 */
async function checkBrewAvailable(): Promise<boolean> {
  try {
    await execAsync('which brew')
    return true
  } catch {
    return false
  }
}

/**
 * Install a Nerd Font via Homebrew cask.
 *
 * @private
 * @param ctx - The icons context with spinner.
 * @param slug - The Homebrew cask slug (e.g. 'jetbrains-mono').
 * @returns A Result with true on success or an IconsError on failure.
 */
async function installViaBrew(ctx: IconsCtx, slug: string): AsyncResult<boolean, IconsError> {
  try {
    ctx.spinner.message(`Installing font-${slug}-nerd-font via Homebrew...`)
    await execAsync(`brew install --cask font-${slug}-nerd-font`)
    return ok(true)
  } catch {
    return iconsError({
      message: `Homebrew installation failed for font-${slug}-nerd-font`,
      type: 'install_failed',
    })
  }
}

/**
 * Install a Nerd Font by downloading from GitHub releases.
 *
 * Downloads the zip archive, extracts it to the appropriate font directory,
 * and refreshes the font cache on Linux.
 *
 * @private
 * @param ctx - The icons context with spinner.
 * @param fontName - The font family name (e.g. 'JetBrainsMono').
 * @returns A Result with true on success or an IconsError on failure.
 */
async function installViaDownload(
  ctx: IconsCtx,
  fontName: string
): AsyncResult<boolean, IconsError> {
  const fontDir = match(process.platform)
    .with('darwin', () => join(homedir(), 'Library', 'Fonts'))
    .otherwise(() => join(homedir(), '.local', 'share', 'fonts'))

  try {
    await mkdir(fontDir, { recursive: true })

    const url = `https://github.com/ryanoasis/nerd-fonts/releases/latest/download/${fontName}.zip`
    const tmpZip = join(fontDir, `${fontName}.zip`)

    ctx.spinner.message(`Downloading ${fontName} Nerd Font...`)
    await execAsync(`curl -fsSL -o "${tmpZip}" "${url}"`, { timeout: 120_000 })

    ctx.spinner.message(`Extracting ${fontName} Nerd Font...`)
    await execAsync(`unzip -o "${tmpZip}" -d "${fontDir}"`)

    await rm(tmpZip, { force: true })

    if (process.platform === 'linux') {
      ctx.spinner.message('Refreshing font cache...')
      await execAsync('fc-cache -fv')
    }

    return ok(true)
  } catch {
    return iconsError({
      message: `Failed to download and install ${fontName} Nerd Font`,
      type: 'install_failed',
    })
  }
}

/**
 * Convert a font family name to a Homebrew cask slug.
 *
 * @private
 * @param name - The font family name (e.g. 'JetBrainsMono').
 * @returns The slug (e.g. 'jetbrains-mono').
 */
function fontNameToSlug(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Construct a failure Result tuple with an {@link IconsError}.
 *
 * @private
 * @param error - The icons error.
 * @returns A Result tuple `[IconsError, null]`.
 */
function iconsError(error: IconsError): AsyncResult<never, IconsError> {
  return Promise.resolve([error, null] as const)
}
