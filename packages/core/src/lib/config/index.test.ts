import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createConfigClient } from './index.js'

const schema = z.object({
  features: z.array(z.string()).optional(),
  name: z.string(),
  version: z.number(),
})

type TestConfig = z.infer<typeof schema>

const validConfig: TestConfig = {
  features: ['auth', 'logging'],
  name: 'test-app',
  version: 1,
}

function createTmpDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'kidd-config-')))
  mkdirSync(join(dir, '.git'), { recursive: true })
  return dir
}

describe('config', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = createTmpDir()
  })

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true })
  })

  describe('find', () => {
    it('should find myapp.config.json via c12', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should find myapp.config.jsonc via c12', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.config.jsonc'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.config.jsonc'))
    })

    it('should fall back to .myapp.json dotfile', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.json'), '{}')

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, '.myapp.json'))
    })

    it('should fall back to .myapp.jsonc dotfile', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.jsonc'), '{}')

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, '.myapp.jsonc'))
    })

    it('should fall back to .myapp.yaml dotfile', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.yaml'), 'name: test\n')

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, '.myapp.yaml'))
    })

    it('should prefer name.config.* over dotfile', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.json'), '{}')
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should search searchPaths first', async () => {
      const searchDir = join(tmpDir, 'custom-search')
      mkdirSync(searchDir, { recursive: true })
      writeFileSync(join(searchDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const client = createConfigClient({
        name: 'myapp',
        schema,
        searchPaths: [searchDir],
      })

      const result = await client.find(tmpDir)

      expect(result).toBe(join(searchDir, 'myapp.config.json'))
    })

    it('should fall back to project root when not in cwd', async () => {
      const subDir = join(tmpDir, 'packages', 'sub')
      mkdirSync(subDir, { recursive: true })
      writeFileSync(join(tmpDir, '.myapp.json'), '{}')

      const client = createConfigClient({ name: 'myapp', schema })

      const result = await client.find(subDir)

      expect(result).toBe(join(tmpDir, '.myapp.json'))
    })

    it('should return null when no config found', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const result = await client.find(tmpDir)

      expect(result).toBeNull()
    })

    it('should handle empty searchPaths array', async () => {
      const client = createConfigClient({ name: 'myapp', schema, searchPaths: [] })
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should find dotfile in searchPaths when c12 finds nothing', async () => {
      const searchDir = join(tmpDir, 'search-dotfile')
      mkdirSync(searchDir, { recursive: true })
      writeFileSync(join(searchDir, '.myapp.json'), JSON.stringify(validConfig, null, 2))

      const client = createConfigClient({
        name: 'myapp',
        schema,
        searchPaths: [searchDir],
      })

      const result = await client.find(tmpDir)

      expect(result).toBe(join(searchDir, '.myapp.json'))
    })
  })

  describe('load', () => {
    it('should load and validate JSON config via c12', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.json'))
      expect(result!.format).toBe('json')
    })

    it('should load and validate JSONC config via c12', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const jsoncContent = `{
  // This is a comment
  "name": "test-app",
  "version": 1,
  "features": [
    "auth",
    "logging"
  ]
}`
      writeFileSync(join(tmpDir, 'myapp.config.jsonc'), jsoncContent)

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.jsonc'))
      expect(result!.format).toBe('jsonc')
    })

    it('should load dotfile JSON config as fallback', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.json'), JSON.stringify(validConfig, null, 2))

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.json'))
      expect(result!.format).toBe('json')
    })

    it('should load dotfile JSONC config as fallback', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const jsoncContent = `{
  // This is a comment
  "name": "test-app",
  "version": 1,
  "features": [
    "auth",
    "logging"
  ]
}`
      writeFileSync(join(tmpDir, '.myapp.jsonc'), jsoncContent)

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.jsonc'))
      expect(result!.format).toBe('jsonc')
    })

    it('should load dotfile YAML config as fallback', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const yamlContent = `name: test-app
version: 1
features:
  - auth
  - logging
`
      writeFileSync(join(tmpDir, '.myapp.yaml'), yamlContent)

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.yaml'))
      expect(result!.format).toBe('yaml')
    })

    it('should prefer name.config.* over dotfile when loading', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.json'), JSON.stringify({ name: 'dotfile', version: 1 }))
      writeFileSync(join(tmpDir, 'myapp.config.json'), JSON.stringify(validConfig, null, 2))

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config.name).toBe('test-app')
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.json'))
    })

    it('should return [null, null] when no config found', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).toBeNull()
    })

    it('should return Error for invalid JSON in dotfile', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.json'), '{ invalid json }')

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Failed to parse JSON')
    })

    it('should return Error for invalid JSONC in dotfile', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.jsonc'), '{ "name": }')

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Failed to parse JSONC')
    })

    it('should return Error for invalid YAML in dotfile', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.yaml'), ':\n  :\n    - :\n  bad: [')

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Failed to parse YAML')
    })

    it('should return Error for schema mismatch', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(
        join(tmpDir, 'myapp.config.json'),
        JSON.stringify({ name: 123, version: 'not-a-number' })
      )

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Invalid config')
    })

    it('should return Error with validation details for schema mismatch', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(
        join(tmpDir, '.myapp.json'),
        JSON.stringify({ name: 123, version: 'not-a-number' })
      )

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('name')
      expect(error!.message).toContain('version')
    })

    it('should return Error when dotfile exists but is unreadable', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const filePath = join(tmpDir, '.myapp.json')
      writeFileSync(filePath, JSON.stringify(validConfig))
      chmodSync(filePath, 0o000)

      const [error, result] = await client.load(tmpDir)

      chmodSync(filePath, 0o644)
      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Failed to read config')
    })

    it('should strip extra fields not in schema', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(
        join(tmpDir, 'myapp.config.json'),
        JSON.stringify({ ...validConfig, extraField: 'should-be-stripped' })
      )

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect((result!.config as Record<string, unknown>)['extraField']).toBeUndefined()
    })

    it('should gracefully handle c12 failure and fall back to dotfile', async () => {
      const client = createConfigClient({
        name: 'myapp',
        schema,
        searchPaths: ['/nonexistent/path/that/does/not/exist'],
      })
      writeFileSync(join(tmpDir, '.myapp.json'), JSON.stringify(validConfig, null, 2))

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.json'))
    })

    it('should load dotfile via searchPaths when c12 finds nothing', async () => {
      const searchDir = join(tmpDir, 'search-dotfile')
      mkdirSync(searchDir, { recursive: true })
      writeFileSync(join(searchDir, '.myapp.json'), JSON.stringify(validConfig, null, 2))

      const client = createConfigClient({
        name: 'myapp',
        schema,
        searchPaths: [searchDir],
      })

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(searchDir, '.myapp.json'))
    })
  })

  describe('write', () => {
    it('should write JSON config with name.config pattern', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        dir: tmpDir,
        format: 'json',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.json'))
      expect(result!.format).toBe('json')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toEqual(validConfig)
    })

    it('should write JSONC config as default format with name.config pattern', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, { dir: tmpDir })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.jsonc'))
      expect(result!.format).toBe('jsonc')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toEqual(validConfig)
    })

    it('should write YAML config with name.config pattern', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        dir: tmpDir,
        format: 'yaml',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, 'myapp.config.yaml'))
      expect(result!.format).toBe('yaml')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toEqual(validConfig)
    })

    it('should create directories recursively', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const deepDir = join(tmpDir, 'a', 'b', 'c')

      const [error, result] = await client.write(validConfig, {
        dir: deepDir,
        format: 'json',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(deepDir, 'myapp.config.json'))

      const reloadClient = createConfigClient({ name: 'myapp', schema })
      const [loadError, loaded] = await reloadClient.load(deepDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toEqual(validConfig)
    })

    it('should return Error for invalid data', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(
        { name: 123, version: 'bad' } as unknown as TestConfig,
        {
          dir: tmpDir,
        }
      )

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Invalid config data')
    })

    it('should use filePath when provided', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const customPath = join(tmpDir, 'custom', 'config.json')

      const [error, result] = await client.write(validConfig, {
        filePath: customPath,
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(customPath)
    })

    it('should infer format from filePath extension', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const yamlPath = join(tmpDir, 'config.yaml')
      const [yamlError, yamlResult] = await client.write(validConfig, {
        filePath: yamlPath,
      })
      expect(yamlError).toBeNull()
      expect(yamlResult!.format).toBe('yaml')

      const jsoncPath = join(tmpDir, 'config.jsonc')
      const [jsoncError, jsoncResult] = await client.write(validConfig, {
        filePath: jsoncPath,
      })
      expect(jsoncError).toBeNull()
      expect(jsoncResult!.format).toBe('jsonc')

      const jsonPath = join(tmpDir, 'config.json')
      const [jsonError, jsonResult] = await client.write(validConfig, {
        filePath: jsonPath,
      })
      expect(jsonError).toBeNull()
      expect(jsonResult!.format).toBe('json')
    })

    it('should prefer explicit format over filePath extension', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        filePath: join(tmpDir, 'config.yaml'),
        format: 'json',
      })

      expect(error).toBeNull()
      expect(result!.format).toBe('json')
    })

    it('should fall back to jsonc for non-writable filePath extensions', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        filePath: join(tmpDir, 'config.ts'),
      })

      expect(error).toBeNull()
      expect(result!.format).toBe('jsonc')
    })

    it('should return Error when write target directory is unwritable', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const readonlyDir = join(tmpDir, 'readonly')
      mkdirSync(readonlyDir)
      chmodSync(readonlyDir, 0o444)

      const [error, result] = await client.write(validConfig, {
        filePath: join(readonlyDir, 'sub', 'config.json'),
      })

      chmodSync(readonlyDir, 0o755)
      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Failed to create directory')
    })

    it('should round-trip: write then load produces same data', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const data: TestConfig = {
        features: ['feature-a', 'feature-b', 'feature-c'],
        name: 'round-trip-app',
        version: 42,
      }

      const formats = ['json', 'jsonc', 'yaml'] as const
      await Promise.all(
        formats.map(async (format) => {
          const subDir = join(tmpDir, `rt-${format}`)
          mkdirSync(subDir, { recursive: true })
          mkdirSync(join(subDir, '.git'), { recursive: true })

          const [writeError] = await client.write(data, { dir: subDir, format })
          expect(writeError).toBeNull()

          const [loadError, loaded] = await client.load(subDir)
          expect(loadError).toBeNull()
          expect(loaded!.config).toEqual(data)
          expect(loaded!.format).toBe(format)
        })
      )
    })
  })
})
