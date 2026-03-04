import type { Result } from '@kidd-cli/utils/fp'
import type { Liquid } from 'liquidjs'

/**
 * Options for JSON serialization output.
 */
export interface JsonOutputOptions {
  pretty?: boolean
  redact?: boolean
}

/**
 * Parameters for writing content to a file.
 */
export interface WriteParams {
  path: string
  content: string
}

/**
 * Parameters for rendering data to markdown via a Liquid template.
 */
export interface ToMarkdownParams {
  data: unknown
  type: string
}

/**
 * Options for creating an output instance.
 */
export interface CreateOutputOptions {
  output?: NodeJS.WriteStream
  templates?: string
  filters?: Record<string, (...args: unknown[]) => unknown>
  context?: (params: ToMarkdownParams) => Record<string, unknown>
}

/**
 * Structured output utilities for JSON, markdown, and file writing.
 */
export interface CliOutput {
  toJson(data: unknown, options?: JsonOutputOptions): string
  toMarkdown(params: ToMarkdownParams): Result<string, Error>
  json(data: unknown, options?: JsonOutputOptions): void
  write(params: WriteParams): Result<void, Error>
  print(content: string): void
}

interface CreateRendererOptions {
  templates: string
  filters?: Record<string, (...args: unknown[]) => unknown>
  context?: (params: ToMarkdownParams) => Record<string, unknown>
}

interface Renderer {
  render(params: ToMarkdownParams): Result<string, Error>
}

interface LoadTemplateOptions {
  readonly templatesDir: string
  readonly type: string
  readonly cache: Map<string, string>
}

interface RenderTemplateOptions {
  liquid: Liquid
  template: string
  params: ToMarkdownParams
  extraContext: Record<string, unknown>
}

export type { CreateRendererOptions, LoadTemplateOptions, Renderer, RenderTemplateOptions }
