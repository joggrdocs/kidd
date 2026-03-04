import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
  const dir = mkdtempSync(join(tmpdir(), 'kidd-config-'))
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
    it('finds .myapp.jsonc file', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.jsonc'), '{}')

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, '.myapp.jsonc'))
    })

    it('finds .myapp.json file', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.json'), '{}')

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, '.myapp.json'))
    })

    it('finds .myapp.yaml file', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.yaml'), 'name: test\n')

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, '.myapp.yaml'))
    })

    it('prefers .jsonc over .json over .yaml', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.yaml'), 'name: test\n')
      writeFileSync(join(tmpDir, '.myapp.json'), '{}')
      writeFileSync(join(tmpDir, '.myapp.jsonc'), '{}')

      const result = await client.find(tmpDir)

      expect(result).toBe(join(tmpDir, '.myapp.jsonc'))
    })

    it('searches searchPaths first', async () => {
      const searchDir = join(tmpDir, 'custom-search')
      mkdirSync(searchDir, { recursive: true })
      writeFileSync(join(searchDir, '.myapp.json'), '{}')
      writeFileSync(join(tmpDir, '.myapp.json'), '{}')

      const client = createConfigClient({
        name: 'myapp',
        schema,
        searchPaths: [searchDir],
      })

      const result = await client.find(tmpDir)

      expect(result).toBe(join(searchDir, '.myapp.json'))
    })

    it('falls back to project root when not in cwd', async () => {
      const subDir = join(tmpDir, 'packages', 'sub')
      mkdirSync(subDir, { recursive: true })
      writeFileSync(join(tmpDir, '.myapp.json'), '{}')

      const client = createConfigClient({ name: 'myapp', schema })

      const result = await client.find(subDir)

      expect(result).toBe(join(tmpDir, '.myapp.json'))
    })

    it('returns null when no config found', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const result = await client.find(tmpDir)

      expect(result).toBeNull()
    })
  })

  describe('load', () => {
    it('loads and validates JSON config', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.json'), JSON.stringify(validConfig, null, 2))

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.json'))
      expect(result!.format).toBe('json')
    })

    it('loads and validates JSONC config with comments and trailing commas', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const jsoncContent = `{
  // This is a comment
  "name": "test-app",
  "version": 1,
  "features": [
    "auth",
    "logging", // trailing comma
  ],
}`
      writeFileSync(join(tmpDir, '.myapp.jsonc'), jsoncContent)

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).not.toBeNull()
      expect(result!.config).toEqual(validConfig)
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.jsonc'))
      expect(result!.format).toBe('jsonc')
    })

    it('loads and validates YAML config', async () => {
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

    it('returns [null, null] when no config found', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.load(tmpDir)

      expect(error).toBeNull()
      expect(result).toBeNull()
    })

    it('returns Error for invalid JSON', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.json'), '{ invalid json }')

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Failed to parse JSON')
    })

    it('returns Error for invalid JSONC', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.jsonc'), '{ "name": }')

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Failed to parse JSONC')
    })

    it('returns Error for invalid YAML', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(join(tmpDir, '.myapp.yaml'), ':\n  :\n    - :\n  bad: [')

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Failed to parse YAML')
    })

    it('returns Error for schema mismatch', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      writeFileSync(
        join(tmpDir, '.myapp.json'),
        JSON.stringify({ name: 123, version: 'not-a-number' })
      )

      const [error, result] = await client.load(tmpDir)

      expect(result).toBeNull()
      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toContain('Invalid config')
    })

    it('returns Error with validation details for schema mismatch', async () => {
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
  })

  describe('write', () => {
    it('writes JSON config', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        dir: tmpDir,
        format: 'json',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.json'))
      expect(result!.format).toBe('json')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toEqual(validConfig)
    })

    it('writes JSONC config as default format', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, { dir: tmpDir })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.jsonc'))
      expect(result!.format).toBe('jsonc')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toEqual(validConfig)
    })

    it('writes YAML config', async () => {
      const client = createConfigClient({ name: 'myapp', schema })

      const [error, result] = await client.write(validConfig, {
        dir: tmpDir,
        format: 'yaml',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(tmpDir, '.myapp.yaml'))
      expect(result!.format).toBe('yaml')

      const [loadError, loaded] = await client.load(tmpDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toEqual(validConfig)
    })

    it('creates directories recursively', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const deepDir = join(tmpDir, 'a', 'b', 'c')

      const [error, result] = await client.write(validConfig, {
        dir: deepDir,
        format: 'json',
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(join(deepDir, '.myapp.json'))

      const reloadClient = createConfigClient({ name: 'myapp', schema })
      const [loadError, loaded] = await reloadClient.load(deepDir)
      expect(loadError).toBeNull()
      expect(loaded!.config).toEqual(validConfig)
    })

    it('returns Error for invalid data', async () => {
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

    it('uses filePath when provided', async () => {
      const client = createConfigClient({ name: 'myapp', schema })
      const customPath = join(tmpDir, 'custom', 'config.json')

      const [error, result] = await client.write(validConfig, {
        filePath: customPath,
      })

      expect(error).toBeNull()
      expect(result!.filePath).toBe(customPath)
    })

    it('infers format from filePath extension', async () => {
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

    it('round-trip: write then load should produce same data', async () => {
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
