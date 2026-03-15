import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import { readTemplateVersions } from './template-versions.js'

const workspaceContent = readFileSync(
  join(import.meta.dirname, '..', '..', '..', '..', 'pnpm-workspace.yaml'),
  'utf8'
)
const { catalog } = parse(workspaceContent) as {
  catalog: { tsdown: string; typescript: string; vitest: string; zod: string }
}

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

describe('readTemplateVersions', () => {
  it('should return versions matching the workspace catalog', () => {
    const [error, versions] = readTemplateVersions()
    expect(error).toBeNull()
    expect(versions).not.toBeNull()
    expect(versions!.zodVersion).toBe(normalizeVersion(catalog.zod))
    expect(versions!.typescriptVersion).toBe(normalizeVersion(catalog.typescript))
    expect(versions!.vitestVersion).toBe(normalizeVersion(catalog.vitest))
    expect(versions!.tsdownVersion).toBe(normalizeVersion(catalog.tsdown))
  })

  it('should add caret prefix to versions without a range operator', () => {
    const [, versions] = readTemplateVersions()
    expect(versions!.tsdownVersion).toBe(`^${catalog.tsdown}`)
  })

  it('should preserve existing range operators', () => {
    const [, versions] = readTemplateVersions()
    expect(versions!.zodVersion).toBe(catalog.zod)
    expect(versions!.typescriptVersion).toBe(catalog.typescript)
    expect(versions!.vitestVersion).toBe(catalog.vitest)
  })
})
