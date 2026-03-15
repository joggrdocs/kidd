import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import { normalizeVersion, readTemplateVersions } from './template-versions.js'

const workspaceContent = readFileSync(
  join(import.meta.dirname, '..', '..', '..', '..', 'pnpm-workspace.yaml'),
  'utf8'
)
const { catalog } = parse(workspaceContent) as {
  catalog: { tsdown: string; typescript: string; vitest: string; zod: string }
}

describe('normalizeVersion', () => {
  it('should return version as-is when it starts with ^', () => {
    expect(normalizeVersion('^1.2.3')).toBe('^1.2.3')
  })

  it('should return version as-is when it starts with ~', () => {
    expect(normalizeVersion('~1.2.3')).toBe('~1.2.3')
  })

  it('should return version as-is when it starts with >', () => {
    expect(normalizeVersion('>1.2.3')).toBe('>1.2.3')
  })

  it('should return version as-is when it starts with <', () => {
    expect(normalizeVersion('<1.2.3')).toBe('<1.2.3')
  })

  it('should return version as-is when it starts with =', () => {
    expect(normalizeVersion('=1.2.3')).toBe('=1.2.3')
  })

  it('should add caret prefix to bare version strings', () => {
    expect(normalizeVersion('1.2.3')).toBe('^1.2.3')
  })
})

describe('readTemplateVersions', () => {
  it('should return versions matching the workspace catalog', () => {
    const [error, versions] = readTemplateVersions()
    expect(error).toBeNull()
    if (error) {
      return
    }
    expect(versions.zodVersion).toBe(normalizeVersion(catalog.zod))
    expect(versions.typescriptVersion).toBe(normalizeVersion(catalog.typescript))
    expect(versions.vitestVersion).toBe(normalizeVersion(catalog.vitest))
    expect(versions.tsdownVersion).toBe(normalizeVersion(catalog.tsdown))
  })

  it('should return a frozen object', () => {
    const [error, versions] = readTemplateVersions()
    expect(error).toBeNull()
    if (error) {
      return
    }
    expect(Object.isFrozen(versions)).toBeTruthy()
  })
})
