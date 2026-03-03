import fs from 'node:fs'
import path from 'node:path'

import { attempt, err, ok } from '@kidd/utils/fp'
import type { Result } from '@kidd/utils/fp'
import { Liquid } from 'liquidjs'

import type {
  CreateRendererOptions,
  LoadTemplateOptions,
  Renderer,
  RenderTemplateOptions,
  ToMarkdownParams,
} from './types.js'

/**
 * Resolve an unknown error to a string message.
 *
 * @param error - The error to resolve.
 * @returns A string error message.
 */
export function resolveRenderError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

/**
 * Create a Liquid template {@link Renderer}.
 *
 * @param options - Renderer configuration.
 * @returns A Renderer instance.
 */
export function createRenderer(options: CreateRendererOptions): Renderer {
  const { templates: templatesDir, filters = {}, context } = options
  const liquid = new Liquid()
  const templateCache = new Map<string, string>()

  for (const [name, fn] of Object.entries(filters)) {
    liquid.registerFilter(name, fn)
  }

  return {
    render(params: ToMarkdownParams): Result<string, Error> {
      const [templateError, template] = loadTemplateFromDisk({
        cache: templateCache,
        templatesDir,
        type: params.type,
      })
      if (templateError) {
        return [templateError, null]
      }

      const extraContext = resolveExtraContext(context, params)
      return renderTemplate({ extraContext, liquid, params, template })
    },
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve the full filesystem path to a Liquid template file.
 *
 * @private
 */
function resolveTemplatePath(templatesDir: string, type: string): string {
  const segments = type.split(':')
  return `${path.join(templatesDir, ...segments)}.liquid`
}

/**
 * Load a Liquid template from disk, using a cache to avoid redundant reads.
 *
 * @private
 */
function loadTemplateFromDisk(options: LoadTemplateOptions): Result<string, Error> {
  const { templatesDir, type, cache } = options
  const cached = cache.get(type)
  if (cached !== undefined) {
    return ok(cached)
  }

  const templatePath = resolveTemplatePath(templatesDir, type)
  const [error, content] = attempt(() => fs.readFileSync(templatePath, 'utf8'))

  if (error || content === null) {
    return err(new Error(`Template not found for type '${type}': ${templatePath}`))
  }

  cache.set(type, content)
  return ok(content)
}

/**
 * Resolve additional template context from the user-provided context function.
 *
 * @private
 */
function resolveExtraContext(
  context: ((params: ToMarkdownParams) => Record<string, unknown>) | undefined,
  params: ToMarkdownParams
): Record<string, unknown> {
  if (context) {
    return context(params)
  }
  return {}
}

/**
 * Render a Liquid template with the given parameters and context.
 *
 * @private
 */
function renderTemplate(options: RenderTemplateOptions): Result<string, Error> {
  const { liquid, template, params, extraContext } = options
  const [error, result] = attempt(() =>
    liquid.parseAndRenderSync(template, {
      ...(params.data as object),
      ...extraContext,
    })
  )

  if (error || result === undefined) {
    const errorMessage = resolveRenderError(error)
    return err(new Error(`Failed to render template for ${params.type}: ${errorMessage}`))
  }

  return ok(result)
}
