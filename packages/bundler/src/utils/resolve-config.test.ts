import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CLEAN,
  DEFAULT_COMMANDS,
  DEFAULT_ENTRY,
  DEFAULT_MINIFY,
  DEFAULT_OUT_DIR,
  DEFAULT_SOURCEMAP,
  DEFAULT_TARGET,
} from '../constants.js'
import { normalizeCompileOptions, resolveConfig } from './resolve-config.js'

describe('config resolution', () => {
  const cwd = '/project'

  describe('with empty config', () => {
    const resolved = resolveConfig({ config: {}, cwd, version: undefined, binaryName: 'cli' })

    it('should resolve entry to default absolute path', () => {
      expect(resolved.entry).toBe(resolve(cwd, DEFAULT_ENTRY))
    })

    it('should resolve commands to default absolute path', () => {
      expect(resolved.commands).toBe(resolve(cwd, DEFAULT_COMMANDS))
    })

    it('should resolve buildOutDir to default absolute path', () => {
      expect(resolved.buildOutDir).toBe(resolve(cwd, DEFAULT_OUT_DIR))
    })

    it('should resolve compileOutDir to default absolute path', () => {
      expect(resolved.compileOutDir).toBe(resolve(cwd, DEFAULT_OUT_DIR))
    })

    it('should apply default build options', () => {
      expect(resolved.build).toStrictEqual({
        clean: DEFAULT_CLEAN,
        external: [],
        minify: DEFAULT_MINIFY,
        sourcemap: DEFAULT_SOURCEMAP,
        target: DEFAULT_TARGET,
      })
    })

    it('should use binaryName as compile name when no config name', () => {
      expect(resolved.compile.name).toBe('cli')
    })

    it('should default include to empty array', () => {
      expect(resolved.include).toStrictEqual([])
    })

    it('should preserve cwd', () => {
      expect(resolved.cwd).toBe(cwd)
    })

    it('should preserve version', () => {
      expect(resolved.version).toBeUndefined()
    })
  })

  describe('with custom config', () => {
    const resolved = resolveConfig({
      config: {
        build: {
          external: ['pg'],
          minify: true,
          out: './build',
          sourcemap: false,
          target: 'node22',
        },
        commands: './src/commands',
        compile: {
          name: 'my-cli',
          out: './bin',
          targets: ['darwin-arm64'],
        },
        entry: './src/main.ts',
        include: ['assets/**'],
      },
      cwd,
      version: '2.0.0',
      binaryName: 'fallback',
    })

    it('should resolve custom entry as absolute path', () => {
      expect(resolved.entry).toBe(resolve(cwd, './src/main.ts'))
    })

    it('should resolve custom commands as absolute path', () => {
      expect(resolved.commands).toBe(resolve(cwd, './src/commands'))
    })

    it('should resolve custom buildOutDir as absolute path', () => {
      expect(resolved.buildOutDir).toBe(resolve(cwd, './build'))
    })

    it('should resolve custom compileOutDir as absolute path', () => {
      expect(resolved.compileOutDir).toBe(resolve(cwd, './bin'))
    })

    it('should use custom build options', () => {
      expect(resolved.build).toStrictEqual({
        clean: DEFAULT_CLEAN,
        external: ['pg'],
        minify: true,
        sourcemap: false,
        target: 'node22',
      })
    })

    it('should prefer config compile name over binaryName', () => {
      expect(resolved.compile.name).toBe('my-cli')
    })

    it('should use custom include globs', () => {
      expect(resolved.include).toStrictEqual(['assets/**'])
    })

    it('should preserve version', () => {
      expect(resolved.version).toBe('2.0.0')
    })
  })

  describe('with compile: true (boolean shorthand)', () => {
    const resolved = resolveConfig({
      config: { compile: true },
      cwd,
      version: undefined,
      binaryName: 'my-app',
    })

    it('should use binaryName as compile name', () => {
      expect(resolved.compile.name).toBe('my-app')
    })
  })

  describe('with compile: false', () => {
    const resolved = resolveConfig({
      config: { compile: false },
      cwd,
      version: undefined,
      binaryName: 'cli',
    })

    it('should use binaryName as compile name', () => {
      expect(resolved.compile.name).toBe('cli')
    })
  })
})

describe(normalizeCompileOptions, () => {
  it('should return empty object for true', () => {
    expect(normalizeCompileOptions(true)).toStrictEqual({})
  })

  it('should return empty object for false', () => {
    expect(normalizeCompileOptions(false)).toStrictEqual({})
  })

  it('should return empty object for undefined', () => {
    expect(normalizeCompileOptions(undefined)).toStrictEqual({})
  })

  it('should pass through an object', () => {
    const opts = { name: 'my-cli', targets: ['darwin-arm64' as const] }

    expect(normalizeCompileOptions(opts)).toStrictEqual(opts)
  })
})
