import { join } from 'node:path'

import { loadConfig } from '@kidd-cli/config/loader'
import type { LoadConfigResult } from '@kidd-cli/config/loader'
import { command } from '@kidd-cli/core'
import type { Command, Context } from '@kidd-cli/core'
import { z } from 'zod'

import { detectProject } from '../../lib/detect.js'
import { renderTemplate } from '../../lib/render.js'
import { writeFiles } from '../../lib/write.js'

const KEBAB_CASE_CHARS_RE = /^[a-z][\da-z-]*$/

const args = z.object({
  args: z.boolean().describe('Include args schema').optional(),
  description: z.string().describe('Command description').optional(),
  name: z.string().describe('Command name (kebab-case)').optional(),
})

type AddCommandArgs = z.infer<typeof args>

const addCommandCommand: Command = command({
  args,
  description: 'Add a new command to your project',
  handler: async (ctx: Context<AddCommandArgs>) => {
    const cwd = process.cwd()

    const [detectError, project] = await detectProject(cwd)
    if (detectError) {
      return ctx.fail(detectError.message)
    }
    if (!project) {
      return ctx.fail('Not in a kidd project. Run `kidd init` first.')
    }

    const [configError, configResult] = await loadConfig({ cwd: project.rootDir })

    if (configError) {
      // No config file found — all KiddConfig fields are optional, so defaults apply.
    }

    const commandName = await resolveCommandName(ctx)
    const commandDescription = await resolveDescription(ctx)
    const includeArgs = await resolveIncludeArgs(ctx)

    ctx.spinner.start('Generating command...')

    const templateDir = join(import.meta.dirname, '..', '..', 'lib', 'templates', 'command')
    const [renderError, rendered] = await renderTemplate({
      templateDir,
      variables: { commandName, description: commandDescription, includeArgs },
    })

    if (renderError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(renderError.message)
    }

    const outputDir = resolveCommandsDir(configResult, project.rootDir)
    const files = rendered.map((file) => ({
      content: file.content,
      relativePath: file.relativePath.replace('command.ts', `${commandName}.ts`),
    }))

    const [writeError, result] = await writeFiles({ files, outputDir, overwrite: false })

    if (writeError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(writeError.message)
    }

    ctx.spinner.stop('Command created!')

    result.written.map((file) => ctx.output.raw(`  created ${file}`))
    result.skipped.map((file) => ctx.output.raw(`  skipped ${file} (already exists)`))
  },
})

export default addCommandCommand

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
 * Resolve the command name from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The validated command name.
 * @private
 */
async function resolveCommandName(ctx: Context<AddCommandArgs>): Promise<string> {
  if (ctx.args.name) {
    if (!isKebabCase(ctx.args.name)) {
      return ctx.fail('Command name must be kebab-case (e.g. deploy)')
    }
    return ctx.args.name
  }
  return ctx.prompts.text({
    message: 'Command name',
    placeholder: 'deploy',
    validate: (value) => {
      if (value === undefined || !isKebabCase(value)) {
        return 'Must be kebab-case (e.g. deploy)'
      }
      return undefined
    },
  })
}

/**
 * Resolve the command description from args or prompt.
 *
 * @param ctx - Command context.
 * @returns The command description string.
 * @private
 */
async function resolveDescription(ctx: Context<AddCommandArgs>): Promise<string> {
  if (ctx.args.description) {
    return ctx.args.description
  }
  return ctx.prompts.text({
    defaultValue: '',
    message: 'Description',
    placeholder: 'What does this command do?',
  })
}

/**
 * Resolve whether to include args from args or prompt.
 *
 * @param ctx - Command context.
 * @returns True when the command should include a zod args schema.
 * @private
 */
async function resolveIncludeArgs(ctx: Context<AddCommandArgs>): Promise<boolean> {
  if (ctx.args.args !== undefined && ctx.args.args !== null) {
    return ctx.args.args
  }
  return ctx.prompts.confirm({
    initialValue: true,
    message: 'Include args schema?',
  })
}

/**
 * Resolve the commands output directory from the kidd config.
 *
 * Uses the `commands` field from `kidd.config.ts` when available,
 * falling back to the kidd default of `'commands'`.
 *
 * @param configResult - The loaded config result, or null when loading failed.
 * @param rootDir - The project root directory.
 * @returns The absolute path to the commands directory.
 * @private
 */
function resolveCommandsDir(configResult: LoadConfigResult | null, rootDir: string): string {
  const DEFAULT_COMMANDS = 'commands'

  if (configResult) {
    return join(rootDir, configResult.config.commands ?? DEFAULT_COMMANDS)
  }

  return join(rootDir, DEFAULT_COMMANDS)
}
