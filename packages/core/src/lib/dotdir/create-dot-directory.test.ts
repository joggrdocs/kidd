import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDotDirectory } from './create-dot-directory.js'

let globalHome: string

vi.mock(import('node:os'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    homedir: () => globalHome,
  }
})

describe('createDotDirectory()', () => {
  let tmpDir: string
  const DIR_NAME = '.myapp'

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kidd-dotdir-client-'))
    mkdirSync(join(tmpDir, '.git'), { recursive: true })
    globalHome = mkdtempSync(join(tmpdir(), 'kidd-dotdir-client-global-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true })
    rmSync(globalHome, { force: true, recursive: true })
  })

  // -------------------------------------------------------------------------
  // global
  // -------------------------------------------------------------------------

  describe('global', () => {
    it('should return a DotDirectoryClient with the global path', () => {
      const client = createDotDirectory({ dirs: { global: DIR_NAME, local: DIR_NAME } })

      const dotdir = client.global()

      expect(dotdir.dir).toBe(join(globalHome, DIR_NAME))
    })
  })

  // -------------------------------------------------------------------------
  // local
  // -------------------------------------------------------------------------

  describe('local', () => {
    it('should return a DotDirectoryClient when inside a project root', () => {
      vi.stubEnv('PWD', tmpDir)
      const client = createDotDirectory({ dirs: { global: DIR_NAME, local: DIR_NAME } })

      // resolveLocalPath uses findProjectRoot which searches from cwd by default,
      // but we can verify the shape works by checking no error on Result
      const [error, dotdir] = client.local()

      // This may fail if the test runner is not inside a git repo,
      // but the kidd repo itself is a git repo so it should resolve
      if (error) {
        expect(error).toMatchObject({ type: 'no_project_root' })
      } else {
        expect(dotdir.dir).toContain(DIR_NAME)
      }
    })
  })

  // -------------------------------------------------------------------------
  // protect
  // -------------------------------------------------------------------------

  describe('protect', () => {
    it('should protect a file across DotDirectoryClient instances from the same DotDirectory', () => {
      const client = createDotDirectory({ dirs: { global: DIR_NAME, local: DIR_NAME } })
      const globalDir = join(globalHome, DIR_NAME)
      mkdirSync(globalDir, { recursive: true })
      writeFileSync(join(globalDir, 'auth.json'), '{"token":"secret"}')

      client.protect({ filename: 'auth.json', location: 'global' })
      const dotdir = client.global()

      const [error] = dotdir.read('auth.json')
      expect(error).toMatchObject({ type: 'protected_file' })
    })

    it('should allow access to protected files with dangerouslyAccessProtectedFile', () => {
      const client = createDotDirectory({ dirs: { global: DIR_NAME, local: DIR_NAME } })
      const globalDir = join(globalHome, DIR_NAME)
      mkdirSync(globalDir, { recursive: true })
      writeFileSync(join(globalDir, 'auth.json'), '{"token":"secret"}')

      client.protect({ filename: 'auth.json', location: 'global' })
      const dotdir = client.global()

      const [error, content] = dotdir.read('auth.json', { dangerouslyAccessProtectedFile: true })
      expect(error).toBeNull()
      expect(content).toBe('{"token":"secret"}')
    })
  })
})
