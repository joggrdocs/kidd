import { join } from 'node:path'

import { command } from '@kidd-cli/core'
import type { Command, Context } from '@kidd-cli/core'
import { z } from 'zod'

import { detectProject } from '../../lib/detect.js'
import { renderTemplate } from '../../lib/render.js'
import { writeFiles } from '../../lib/write.js'

const KEBAB_CASE_CHARS_RE = /^[a-z][\da-z-]*$/

const args = z.object({
  description: z.string().describe('Middleware description').optional(),
  name: z.string().describe('Middleware name (kebab-case)').optional(),
})

type AddMiddlewareArgs = z.infer<typeof args>

const addMiddlewareCommand: Command = command({
  args,
  description: 'Add a new middleware to your project',
  handler: async (ctx: Context<AddMiddlewareArgs>) => {
    const [detectError, project] = await detectProject(process.cwd())
    if (detectError) {
      return ctx.fail(detectError.message)
    }
    if (!project) {
      return ctx.fail('Not in a kidd project. Run `kidd init` first.')
    }

    const middlewareName = await resolveMiddlewareName(ctx)
    const middlewareDescription = await resolveDescription(ctx)

    ctx.spinner.start('Generating middleware...')

    const templateDir = join(import.meta.dirname, '..', '..', 'lib', 'templates', 'middleware')
    const [renderError, rendered] = await renderTemplate({
      templateDir,
      variables: { description: middlewareDescription, middlewareName },
    })

    if (renderError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(renderError.message)
    }

    const outputDir = join(project.rootDir, 'src', 'middleware')
    const files = rendered.map((file) => ({
      content: file.content,
      relativePath: file.relativePath.replace('middleware.ts', `${middlewareName}.ts`),
    }))

    const [writeError, result] = await writeFiles({ files, outputDir, overwrite: false })

    if (writeError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(writeError.message)
    }

    ctx.spinner.stop('Middleware created!')

    result.written.map((file) => ctx.output.raw(`  created ${file}`))
    result.skipped.map((file) => ctx.output.raw(`  skipped ${file} (already exists)`))
  },
})

export default addMiddlewareCommand

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a string is valid kebab-case.
 *
 * @param value - The string to validate.
 * @returns True when the string is kebab-case.
 * @private
 */
function isKebabCase(value: string): boolean {
  if (!KEBAB_CASE_CHARS_RE.test(value)) {
    return false
  }
  if (value.endsWith('-')) {
    return false
  }
  if (value.includes('--')) {
    return false
  }
  return true
}

/**
 * Resolve the middleware name from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The validated middleware name.
 * @private
 */
async function resolveMiddlewareName(ctx: Context<AddMiddlewareArgs>): Promise<string> {
  if (ctx.args.name) {
    if (!isKebabCase(ctx.args.name)) {
      return ctx.fail('Middleware name must be kebab-case (e.g. auth)')
    }
    return ctx.args.name
  }
  return ctx.prompts.text({
    message: 'Middleware name',
    placeholder: 'auth',
    validate: (value) => {
      if (value === undefined || !isKebabCase(value)) {
        return 'Must be kebab-case (e.g. auth)'
      }
      return undefined
    },
  })
}

/**
 * Resolve the middleware description from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The middleware description string.
 * @private
 */
async function resolveDescription(ctx: Context<AddMiddlewareArgs>): Promise<string> {
  if (ctx.args.description) {
    return ctx.args.description
  }
  return ctx.prompts.text({
    defaultValue: '',
    message: 'Description',
    placeholder: 'What does this middleware do?',
  })
}
