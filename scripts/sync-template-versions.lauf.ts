import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { lauf, z } from 'laufen'
import { parse } from 'yaml'

const CATALOG_KEYS = ['zod', 'typescript', 'vitest', 'tsdown'] as const

const OUTPUT_PATH = join('packages', 'cli', 'src', 'generated', 'template-versions.ts')

const BANNER = `// ============================================================================
// AUTO-GENERATED FILE — DO NOT EDIT
//
// Synced from pnpm-workspace.yaml catalog.
// To regenerate: pnpm lauf sync-template-versions
// ============================================================================`

const CONSTANT_NAMES: Record<(typeof CATALOG_KEYS)[number], string> = {
  tsdown: 'TSDOWN_VERSION',
  typescript: 'TYPESCRIPT_VERSION',
  vitest: 'VITEST_VERSION',
  zod: 'ZOD_VERSION',
}

const JSDOC_LABELS: Record<(typeof CATALOG_KEYS)[number], string> = {
  tsdown: 'Tsdown',
  typescript: 'TypeScript',
  vitest: 'Vitest',
  zod: 'Zod',
}

export default lauf({
  args: {
    check: z.boolean().default(false).describe('Check if the generated file is up to date'),
    verbose: z.boolean().default(false).describe('Enable verbose logging'),
  },
  description: 'Sync template dependency versions from pnpm-workspace.yaml catalog',
  async run(ctx) {
    const workspaceContent = readFileSync('pnpm-workspace.yaml', 'utf8')
    const { catalog } = parse(workspaceContent) as { catalog: Record<string, string> }

    if (ctx.args.verbose) {
      ctx.logger.info(`Read catalog from pnpm-workspace.yaml`)
    }

    const versions = CATALOG_KEYS.map((key) => {
      const raw = catalog[key]
      if (raw === undefined) {
        ctx.logger.error(`Missing catalog key: ${key}`)
        process.exit(1)
      }
      return [key, normalizeVersion(raw)] as const
    })

    if (ctx.args.verbose) {
      const summary = versions.map(([key, version]) => `  ${key}: ${version}`).join('\n')
      ctx.logger.info(summary)
    }

    const generated = generateFileContent(versions)

    if (ctx.args.check) {
      if (!existsSync(OUTPUT_PATH)) {
        ctx.logger.error(
          `Output file "${OUTPUT_PATH}" does not exist. Run "pnpm lauf sync-template-versions" to generate it.`
        )
        process.exit(1)
      }
      const existing = readFileSync(OUTPUT_PATH, 'utf8')
      if (existing === generated) {
        ctx.logger.success('Template versions are up to date')
        return
      }
      ctx.logger.error(
        `Template versions are out of date. Run "pnpm lauf sync-template-versions" to update.`
      )
      process.exit(1)
    }

    writeFileSync(OUTPUT_PATH, generated)
    ctx.logger.success(`Wrote ${OUTPUT_PATH}`)
  },
})

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a version string by adding a `^` prefix when no range operator is present.
 *
 * @param version - Raw version string from the catalog.
 * @returns The version with a `^` prefix.
 * @private
 */
function normalizeVersion(version: string): string {
  const RANGE_PREFIXES = ['^', '~', '>', '<', '=']
  if (RANGE_PREFIXES.some((prefix) => version.startsWith(prefix))) {
    return version
  }
  return `^${version}`
}

/**
 * Generate the TypeScript constants file content.
 *
 * @param versions - Array of [catalogKey, normalizedVersion] tuples.
 * @returns The full file content string.
 * @private
 */
function generateFileContent(
  versions: readonly (readonly [(typeof CATALOG_KEYS)[number], string])[]
): string {
  const exports = versions
    .map(([key, version]) => {
      const name = CONSTANT_NAMES[key]
      const label = JSDOC_LABELS[key]
      return `/**\n * ${label} version from the workspace catalog.\n */\nexport const ${name} = '${version}'`
    })
    .join('\n\n')

  return `${BANNER}\n\n${exports}\n`
}
