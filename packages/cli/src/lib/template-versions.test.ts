import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import {
  TSDOWN_VERSION,
  TYPESCRIPT_VERSION,
  VITEST_VERSION,
  ZOD_VERSION,
} from '../generated/template-versions.js'

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

describe('template-versions', () => {
  it('should match zod version from workspace catalog', () => {
    expect(ZOD_VERSION).toBe(normalizeVersion(catalog.zod))
  })

  it('should match typescript version from workspace catalog', () => {
    expect(TYPESCRIPT_VERSION).toBe(normalizeVersion(catalog.typescript))
  })

  it('should match vitest version from workspace catalog', () => {
    expect(VITEST_VERSION).toBe(normalizeVersion(catalog.vitest))
  })

  it('should match tsdown version from workspace catalog', () => {
    expect(TSDOWN_VERSION).toBe(normalizeVersion(catalog.tsdown))
  })
})
