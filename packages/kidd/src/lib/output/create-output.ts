import { err } from '@kidd-cli/utils/fp'
import type { Result } from '@kidd-cli/utils/fp'

import { createCliLogger } from '@/lib/logger.js'

import { formatJson, writeToFile } from './format.js'
import { createRenderer } from './renderer.js'
import type {
  CliOutput,
  CreateOutputOptions,
  JsonOutputOptions,
  Renderer,
  ToMarkdownParams,
} from './types.js'

/**
 * Create a new {@link CliOutput} instance for structured CLI output.
 *
 * @param options - Output configuration.
 * @returns A CliOutput instance.
 */
export function createOutput(options: CreateOutputOptions = {}): CliOutput {
  const logger = createCliLogger({ output: options.output ?? process.stdout })
  const renderer = resolveRenderer(options)

  function toMarkdown(params: ToMarkdownParams): Result<string, Error> {
    if (!renderer) {
      return err(
        new Error('Templates directory not configured. Pass `templates` to createOutput().')
      )
    }
    return renderer.render(params)
  }

  return {
    json(data: unknown, jsonOptions: JsonOutputOptions = {}): void {
      logger.print(formatJson(data, jsonOptions))
    },
    print(content: string): void {
      logger.print(content)
    },
    toJson: formatJson,
    toMarkdown,
    write: writeToFile,
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve a Renderer from the output options, if templates are configured.
 *
 * @private
 */
function resolveRenderer(options: CreateOutputOptions): Renderer | undefined {
  if (options.templates) {
    return createRenderer({
      context: options.context,
      filters: options.filters,
      templates: options.templates,
    })
  }
  return undefined
}
