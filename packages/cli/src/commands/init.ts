import { join } from 'node:path'

import { command } from '@kidd-cli/core'
import type { Command, Context } from '@kidd-cli/core'
import { z } from 'zod'

import { renderTemplate } from '../lib/render.js'
import type { RenderedFile } from '../lib/types.js'
import { writeFiles } from '../lib/write.js'

const KEBAB_CASE_CHARS_RE = /^[a-z][\da-z-]*$/

const args = z.object({
  description: z.string().describe('Project description').optional(),
  example: z.boolean().describe('Include example command').optional(),
  name: z.string().describe('Project name (kebab-case)').optional(),
  pm: z.enum(['pnpm', 'yarn', 'npm']).describe('Package manager').optional(),
})

type InitArgs = z.infer<typeof args>

const initCommand = command({
  args,
  description: 'Scaffold a new kidd CLI project',
  handler: async (ctx: Context<InitArgs>) => {
    const projectName = await resolveProjectName(ctx)
    const projectDescription = await resolveDescription(ctx)
    const packageManager = await resolvePackageManager(ctx)
    const includeExample = await resolveIncludeExample(ctx)

    ctx.spinner.start('Scaffolding project...')

    const templateDir = join(import.meta.dirname, '..', 'lib', 'templates', 'project')
    const [renderError, rendered] = await renderTemplate({
      templateDir,
      variables: { description: projectDescription, name: projectName, packageManager },
    })

    if (renderError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(renderError.message)
    }

    const files = selectFiles(includeExample, rendered)

    const outputDir = join(process.cwd(), projectName)
    const [writeError] = await writeFiles({ files, outputDir, overwrite: false })

    if (writeError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(writeError.message)
    }

    ctx.spinner.stop('Project created!')

    // If (args.verbose) {
    //   Ctx.output.raw('')
    //   Result.written.map((file) => ctx.output.raw(`  created ${file}`))
    //   Result.skipped.map((file) => ctx.output.raw(`  skipped ${file} (already exists)`))
    // }

    ctx.output.raw('')
    ctx.output.raw(`Next steps:`)
    ctx.output.raw(`  cd ${projectName}`)
    ctx.output.raw(`  ${packageManager} install`)
  },
})

export default initCommand as unknown as Command

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
 * Resolve the project name from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The validated project name.
 * @private
 */
async function resolveProjectName(ctx: Context<InitArgs>): Promise<string> {
  if (ctx.args.name) {
    if (!isKebabCase(ctx.args.name)) {
      return ctx.fail('Project name must be kebab-case (e.g. my-cli)')
    }
    return ctx.args.name
  }
  return ctx.prompts.text({
    message: 'Project name',
    placeholder: 'my-cli',
    validate: (value) => {
      if (value === undefined || !isKebabCase(value)) {
        return 'Must be kebab-case (e.g. my-cli)'
      }
      return undefined
    },
  })
}

/**
 * Resolve the project description from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The project description string.
 * @private
 */
async function resolveDescription(ctx: Context<InitArgs>): Promise<string> {
  if (ctx.args.description) {
    return ctx.args.description
  }
  return ctx.prompts.text({
    defaultValue: 'A CLI built with kidd',
    message: 'Description',
    placeholder: 'A CLI built with kidd',
  })
}

/**
 * Resolve the package manager from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The selected package manager.
 * @private
 */
async function resolvePackageManager(ctx: Context<InitArgs>): Promise<string> {
  if (ctx.args.pm) {
    return ctx.args.pm
  }
  return ctx.prompts.select({
    message: 'Package manager',
    options: [
      { label: 'pnpm', value: 'pnpm' },
      { label: 'yarn', value: 'yarn' },
      { label: 'npm', value: 'npm' },
    ],
  })
}

/**
 * Resolve whether to include the example command from args or prompt.
 *
 * @param ctx - Command context.
 * @returns True when the example hello command should be included.
 * @private
 */
async function resolveIncludeExample(ctx: Context<InitArgs>): Promise<boolean> {
  if (ctx.args.example !== undefined && ctx.args.example !== null) {
    return ctx.args.example
  }
  return ctx.prompts.confirm({
    initialValue: true,
    message: 'Include example command?',
  })
}

/**
 * Select the rendered files to write, optionally excluding the example command.
 *
 * @param includeExample - Whether to include the example hello command.
 * @param rendered - The full set of rendered files.
 * @returns The filtered file list.
 * @private
 */
function selectFiles(
  includeExample: boolean,
  rendered: readonly RenderedFile[]
): readonly RenderedFile[] {
  if (includeExample) {
    return rendered
  }
  return rendered.filter(excludeHelloCommand)
}

/**
 * Filter predicate that excludes the hello.ts example command.
 *
 * @param file - A rendered file to check.
 * @returns True when the file is not the hello command.
 * @private
 */
function excludeHelloCommand(file: RenderedFile): boolean {
  return !file.relativePath.includes('commands/hello.ts')
}
