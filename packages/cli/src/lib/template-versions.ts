import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'yaml'

/**
 * Shape of the `catalog` field in `pnpm-workspace.yaml`.
 *
 * @private
 */
interface WorkspaceCatalog {
  readonly tsdown: string
  readonly typescript: string
  readonly vitest: string
  readonly zod: string
}

/**
 * Resolved template dependency versions read from the workspace catalog.
 */
export interface TemplateVersions {
  readonly tsdownVersion: string
  readonly typescriptVersion: string
  readonly vitestVersion: string
  readonly zodVersion: string
}

/**
 * Known locations for `pnpm-workspace.yaml` relative to this module.
 *
 * - First path covers the built `dist/lib/` layout (yaml copied to `dist/`).
 * - Second path covers running from source `src/lib/` during development.
 *
 * @private
 */
const CANDIDATE_PATHS: readonly string[] = [
  join(import.meta.dirname, '..', 'pnpm-workspace.yaml'),
  join(import.meta.dirname, '..', '..', '..', '..', 'pnpm-workspace.yaml'),
]

/**
 * Locate `pnpm-workspace.yaml` by checking known candidate paths.
 *
 * @returns The resolved path, or `null` when no candidate exists.
 * @private
 */
function findWorkspaceYaml(): string | null {
  const found = CANDIDATE_PATHS.find(existsSync)
  return found ?? null
}

/**
 * Normalize a version string to always include a caret range prefix.
 *
 * If the version already starts with a range operator (`^`, `~`, `>`, `<`, `=`)
 * it is returned as-is. Otherwise a `^` prefix is added.
 *
 * @param version - The raw version string from the catalog.
 * @returns The version prefixed with `^` when no range operator is present.
 * @private
 */
function normalizeVersion(version: string): string {
  if (
    version.startsWith('^') ||
    version.startsWith('~') ||
    version.startsWith('>') ||
    version.startsWith('<') ||
    version.startsWith('=')
  ) {
    return version
  }
  return `^${version}`
}

/**
 * Read template dependency versions from the workspace catalog (`pnpm-workspace.yaml`).
 *
 * Resolves the workspace file from known relative locations, parses the YAML,
 * and returns normalized version strings suitable for scaffolding `package.json`
 * files in new projects.
 *
 * @returns A `Result` tuple with the resolved versions or an error.
 */
export function readTemplateVersions(): readonly [Error, null] | readonly [null, TemplateVersions] {
  const yamlPath = findWorkspaceYaml()
  if (yamlPath === null) {
    return [new Error('Could not locate pnpm-workspace.yaml'), null]
  }

  const content = readFileSync(yamlPath, 'utf8')
  const parsed = parse(content) as { catalog: WorkspaceCatalog }

  return [
    null,
    Object.freeze({
      tsdownVersion: normalizeVersion(parsed.catalog.tsdown),
      typescriptVersion: normalizeVersion(parsed.catalog.typescript),
      vitestVersion: normalizeVersion(parsed.catalog.vitest),
      zodVersion: normalizeVersion(parsed.catalog.zod),
    }),
  ]
}
