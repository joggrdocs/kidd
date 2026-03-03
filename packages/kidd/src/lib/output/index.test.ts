import fs, { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createOutput, output } from './index.js'

const JSON_INDENT = 2
const FIRST_ARG_INDEX = 0

function createMockStream(): NodeJS.WriteStream & { written: string[] } {
  const written: string[] = []
  return {
    write: vi.fn((text: string) => {
      written.push(text)
      return true
    }),
    written,
  } as unknown as NodeJS.WriteStream & { written: string[] }
}

describe('createOutput()', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kidd-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { force: true, recursive: true })
  })

  // -------------------------------------------------------------------------
  // ToJson
  // -------------------------------------------------------------------------

  describe('toJson', () => {
    it('returns pretty-printed JSON by default (pretty=true)', () => {
      const out = createOutput()
      const data = { count: 42, name: 'test' }
      const result = out.toJson(data)

      expect(result).toBe(JSON.stringify(data, null, JSON_INDENT))
      expect(result).toContain('\n')
    })

    it('returns compact JSON when pretty=false', () => {
      const out = createOutput()
      const data = { count: 42, name: 'test' }
      const result = out.toJson(data, { pretty: false })

      expect(result).toBe(JSON.stringify(data))
      expect(result).not.toContain('\n')
    })

    it('redacts sensitive fields when redact=true', () => {
      const out = createOutput()
      const data = { name: 'test', password: 'hunter2', token: 'secret123' }
      const result = out.toJson(data, { redact: true })
      const parsed = JSON.parse(result)

      expect(parsed.token).toBe('[REDACTED]')
      expect(parsed.password).toBe('[REDACTED]')
      expect(parsed.name).toBe('test')
    })

    it('preserves all fields when redact=false (default)', () => {
      const out = createOutput()
      const data = { name: 'test', token: 'secret123' }
      const result = out.toJson(data, { redact: false })
      const parsed = JSON.parse(result)

      expect(parsed.token).toBe('secret123')
      expect(parsed.name).toBe('test')
    })

    it('preserves all fields when redact is not specified', () => {
      const out = createOutput()
      const data = { name: 'test', token: 'secret123' }
      const result = out.toJson(data)
      const parsed = JSON.parse(result)

      expect(parsed.token).toBe('secret123')
      expect(parsed.name).toBe('test')
    })

    it('handles nested objects with redact=true', () => {
      const out = createOutput()
      const data = {
        config: {
          apiKey: 'key456',
          host: 'localhost',
          token: 'abc123',
        },
        name: 'app',
      }
      const result = out.toJson(data, { redact: true })
      const parsed = JSON.parse(result)

      expect(parsed.config.token).toBe('[REDACTED]')
      expect(parsed.config.apiKey).toBe('[REDACTED]')
      expect(parsed.config.host).toBe('localhost')
    })

    it('handles arrays in JSON output', () => {
      const out = createOutput()
      const data = [1, 2, 3]
      const result = out.toJson(data)

      expect(JSON.parse(result)).toEqual([1, 2, 3])
    })

    it('handles null and primitive values', () => {
      const out = createOutput()

      expect(out.toJson(null)).toBe('null')
      expect(out.toJson(42)).toBe('42')
      expect(out.toJson('hello')).toBe('"hello"')
    })

    it('combines pretty=false and redact=true', () => {
      const out = createOutput()
      const data = { name: 'test', token: 'secret' }
      const result = out.toJson(data, { pretty: false, redact: true })
      const parsed = JSON.parse(result)

      expect(result).not.toContain('\n')
      expect(parsed.token).toBe('[REDACTED]')
      expect(parsed.name).toBe('test')
    })
  })

  // -------------------------------------------------------------------------
  // ToMarkdown
  // -------------------------------------------------------------------------

  describe('toMarkdown', () => {
    it('returns error result when templates directory is not configured', () => {
      const out = createOutput()

      const [error] = out.toMarkdown({ data: {}, type: 'test' })

      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toBe(
        'Templates directory not configured. Pass `templates` to createOutput().'
      )
    })

    it('renders a liquid template from the templates directory', () => {
      const templateContent = '# {{ title }}\n\n{{ body }}'
      const templatePath = join(tmpDir, 'doc.liquid')
      fs.writeFileSync(templatePath, templateContent, 'utf8')

      const out = createOutput({ templates: tmpDir })
      const [error, result] = out.toMarkdown({
        data: { body: 'World', title: 'Hello' },
        type: 'doc',
      })

      expect(error).toBeNull()
      expect(result).toBe('# Hello\n\nWorld')
    })

    it('resolves colon-separated types to nested paths', () => {
      const nestedDir = join(tmpDir, 'reports')
      fs.mkdirSync(nestedDir, { recursive: true })
      const templateContent = 'Report: {{ name }}'
      fs.writeFileSync(join(nestedDir, 'summary.liquid'), templateContent, 'utf8')

      const out = createOutput({ templates: tmpDir })
      const [error, result] = out.toMarkdown({
        data: { name: 'Q4' },
        type: 'reports:summary',
      })

      expect(error).toBeNull()
      expect(result).toBe('Report: Q4')
    })

    it('passes custom context to templates', () => {
      const templateContent = '{{ title }} by {{ author }}'
      fs.writeFileSync(join(tmpDir, 'post.liquid'), templateContent, 'utf8')

      const out = createOutput({
        context: () => ({ author: 'Claude' }),
        templates: tmpDir,
      })

      const [error, result] = out.toMarkdown({
        data: { title: 'AI Testing' },
        type: 'post',
      })

      expect(error).toBeNull()
      expect(result).toBe('AI Testing by Claude')
    })

    it('provides ToMarkdownParams to the context function', () => {
      const templateContent = '{{ title }}'
      fs.writeFileSync(join(tmpDir, 'ctx.liquid'), templateContent, 'utf8')

      const contextFn = vi.fn(() => ({}))
      const out = createOutput({
        context: contextFn,
        templates: tmpDir,
      })

      const params = { data: { title: 'test' }, type: 'ctx' }
      out.toMarkdown(params)

      expect(contextFn).toHaveBeenCalledWith(params)
    })

    it('applies custom filters during rendering', () => {
      const templateContent = '{{ name | shout }}'
      fs.writeFileSync(join(tmpDir, 'filter.liquid'), templateContent, 'utf8')

      const out = createOutput({
        filters: {
          shout: (value: unknown) => String(value).toUpperCase(),
        },
        templates: tmpDir,
      })

      const [error, result] = out.toMarkdown({
        data: { name: 'hello' },
        type: 'filter',
      })

      expect(error).toBeNull()
      expect(result).toBe('HELLO')
    })

    it('caches templates and reads the file only once', () => {
      const templateContent = 'Hello {{ name }}'
      fs.writeFileSync(join(tmpDir, 'cached.liquid'), templateContent, 'utf8')

      const readFileSpy = vi.spyOn(fs, 'readFileSync')

      const out = createOutput({ templates: tmpDir })

      const [error1, result1] = out.toMarkdown({ data: { name: 'Alice' }, type: 'cached' })
      const [error2, result2] = out.toMarkdown({ data: { name: 'Bob' }, type: 'cached' })

      expect(error1).toBeNull()
      expect(error2).toBeNull()
      expect(result1).toBe('Hello Alice')
      expect(result2).toBe('Hello Bob')

      // Count only the reads for our specific template file
      const templateFilePath = join(tmpDir, 'cached.liquid')
      const templateReads = readFileSpy.mock.calls.filter(
        (call) => call[FIRST_ARG_INDEX] === templateFilePath
      )
      expect(templateReads).toHaveLength(1)

      readFileSpy.mockRestore()
    })

    it('returns error result for a missing template file', () => {
      const out = createOutput({ templates: tmpDir })

      const [error] = out.toMarkdown({ data: {}, type: 'nonexistent' })

      expect(error).toBeInstanceOf(Error)
      expect(error!.message).toMatch(/Template not found for type 'nonexistent'/)
    })
  })

  // -------------------------------------------------------------------------
  // Json
  // -------------------------------------------------------------------------

  describe('json', () => {
    it('prints JSON to the output stream', () => {
      const stream = createMockStream()
      const out = createOutput({ output: stream })
      const data = { name: 'test' }

      out.json(data)

      expect(stream.write).toHaveBeenCalled()
      const writtenContent = stream.written.join('')
      expect(writtenContent).toContain('"name": "test"')
    })

    it('passes options through to toJson', () => {
      const stream = createMockStream()
      const out = createOutput({ output: stream })
      const data = { name: 'test', token: 'secret' }

      out.json(data, { pretty: false, redact: true })

      const writtenContent = stream.written.join('')
      const parsed = JSON.parse(writtenContent.trim())
      expect(parsed.token).toBe('[REDACTED]')
      expect(parsed.name).toBe('test')
    })
  })

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  describe('write', () => {
    it('writes content to a file on disk', () => {
      const out = createOutput()
      const filePath = join(tmpDir, 'output.txt')

      out.write({ content: 'hello world', path: filePath })

      expect(fs.readFileSync(filePath, 'utf8')).toBe('hello world')
    })

    it('creates parent directories recursively', () => {
      const out = createOutput()
      const filePath = join(tmpDir, 'deep', 'nested', 'dir', 'output.txt')

      out.write({ content: 'nested content', path: filePath })

      expect(fs.readFileSync(filePath, 'utf8')).toBe('nested content')
    })

    it('overwrites existing files', () => {
      const out = createOutput()
      const filePath = join(tmpDir, 'overwrite.txt')

      out.write({ content: 'first', path: filePath })
      out.write({ content: 'second', path: filePath })

      expect(fs.readFileSync(filePath, 'utf8')).toBe('second')
    })
  })

  // -------------------------------------------------------------------------
  // Print
  // -------------------------------------------------------------------------

  describe('print', () => {
    it('prints content to the output stream', () => {
      const stream = createMockStream()
      const out = createOutput({ output: stream })

      out.print('hello')

      expect(stream.write).toHaveBeenCalledWith('hello\n')
    })

    it('handles empty string', () => {
      const stream = createMockStream()
      const out = createOutput({ output: stream })

      out.print('')

      expect(stream.write).toHaveBeenCalledWith('\n')
    })
  })
})

describe('output (default export)', () => {
  it('is a valid CliOutput instance with all expected methods', () => {
    expect(output).toBeDefined()
    expect(typeof output.toJson).toBe('function')
    expect(typeof output.toMarkdown).toBe('function')
    expect(typeof output.json).toBe('function')
    expect(typeof output.write).toBe('function')
    expect(typeof output.print).toBe('function')
    /* eslint-enable eslint-plugin-vitest/prefer-expect-type-of */
  })
})
