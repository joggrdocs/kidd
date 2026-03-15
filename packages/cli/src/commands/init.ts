import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { command } from '@kidd-cli/core'
import type { Command, Context } from '@kidd-cli/core'
import { attempt } from '@kidd-cli/utils/fp'
import { readManifest } from '@kidd-cli/utils/manifest'
import { z } from 'zod'

import {
  TSDOWN_VERSION,
  TYPESCRIPT_VERSION,
  VITEST_VERSION,
  ZOD_VERSION,
} from '../generated/template-versions.js'
import { renderTemplate } from '../lib/render.js'
import type { RenderedFile } from '../lib/types.js'
import { isKebabCase } from '../lib/validate.js'
import { writeFiles } from '../lib/write.js'

const args = z.object({
  config: z.boolean().describe('Include config schema setup').optional(),
  description: z.string().describe('Project description').optional(),
  example: z.boolean().describe('Include example command').optional(),
  name: z.string().describe('Project name (kebab-case)').optional(),
  pm: z.enum(['pnpm', 'yarn', 'npm']).describe('Package manager').optional(),
})

type InitArgs = z.infer<typeof args>

const initCommand: Command = command({
  args,
  description: 'Scaffold a new kidd CLI project',
  handler: async (ctx: Context<InitArgs>) => {
    const projectName = await resolveProjectName(ctx)
    const projectDescription = await resolveDescription(ctx)
    const packageManager = await resolvePackageManager(ctx)
    const includeExample = await resolveIncludeExample(ctx)
    const includeConfig = await resolveIncludeConfig(ctx)

    ctx.spinner.start('Scaffolding project...')

    const coreVersion = await resolveDependencyVersion('@kidd-cli/core')
    const cliVersion = await resolveSelfVersion()

    const templateDir = join(import.meta.dirname, '..', 'lib', 'templates', 'project')
    const [renderError, rendered] = await renderTemplate({
      templateDir,
      variables: {
        cliVersion,
        coreVersion,
        description: projectDescription,
        includeConfig,
        name: projectName,
        packageManager,
        tsdownVersion: TSDOWN_VERSION,
        typescriptVersion: TYPESCRIPT_VERSION,
        vitestVersion: VITEST_VERSION,
        zodVersion: ZOD_VERSION,
      },
    })

    if (renderError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(renderError.message)
    }

    const files = selectFiles({ includeConfig, includeExample }, rendered)

    const outputDir = join(process.cwd(), projectName)
    const [writeError] = await writeFiles({ files, outputDir, overwrite: false })

    if (writeError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(writeError.message)
    }

    ctx.spinner.stop('Project created!')

    ctx.output.raw('')
    ctx.output.raw(`Next steps:`)
    ctx.output.raw(`  cd ${projectName}`)
    ctx.output.raw(`  ${packageManager} install`)
  },
})

export default initCommand

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

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
  if (ctx.args.example !== undefined) {
    return ctx.args.example
  }
  return ctx.prompts.confirm({
    initialValue: true,
    message: 'Include example command?',
  })
}

/**
 * Resolve whether to include config schema setup from args or prompt.
 *
 * @param ctx - Command context.
 * @returns True when the config schema file should be included.
 * @private
 */
async function resolveIncludeConfig(ctx: Context<InitArgs>): Promise<boolean> {
  if (ctx.args.config !== undefined) {
    return ctx.args.config
  }
  return ctx.prompts.confirm({
    initialValue: false,
    message: 'Include config schema?',
  })
}

/**
 * Options for filtering the rendered file set.
 *
 * @private
 */
interface SelectFilesOptions {
  readonly includeConfig: boolean
  readonly includeExample: boolean
}

/**
 * Select the rendered files to write, optionally excluding the example command and config.
 *
 * @param options - Flags controlling which optional files to include.
 * @param rendered - The full set of rendered files.
 * @returns The filtered file list.
 * @private
 */
function selectFiles(
  options: SelectFilesOptions,
  rendered: readonly RenderedFile[]
): readonly RenderedFile[] {
  return rendered
    .filter((file) => options.includeExample || !file.relativePath.includes('commands/hello.ts'))
    .filter((file) => options.includeConfig || !file.relativePath.includes('config.ts'))
}

const DEFAULT_VERSION = '0.0.0'

/**
 * Resolve the version of the running CLI package.
 *
 * Reads the CLI's own `package.json` by navigating up from the current
 * command file directory. Returns `'0.0.0'` when the manifest cannot be
 * read or is missing a version field.
 *
 * @returns The CLI package version string, or `'0.0.0'` on failure.
 * @private
 */
async function resolveSelfVersion(): Promise<string> {
  const packageDir = join(import.meta.dirname, '..', '..')
  const [error, manifest] = await readManifest(packageDir)
  if (error || !manifest.version) {
    return DEFAULT_VERSION
  }
  return manifest.version
}

/**
 * Resolve the installed version of a dependency package.
 *
 * Uses `createRequire` to locate the package entry point, derives the
 * package root from the resolved path, and reads its `package.json`.
 * Returns `'0.0.0'` when resolution fails for any reason.
 *
 * @param packageName - The npm package name to resolve (e.g. `'@kidd-cli/core'`).
 * @returns The package version string, or `'0.0.0'` on failure.
 * @private
 */
async function resolveDependencyVersion(packageName: string): Promise<string> {
  const require = createRequire(import.meta.url)
  const [resolveError, entryPath] = attempt(() => require.resolve(packageName))
  if (resolveError || entryPath === null) {
    return DEFAULT_VERSION
  }

  const packageDir = join(dirname(entryPath), '..')
  const [manifestError, manifest] = await readManifest(packageDir)
  if (manifestError || !manifest.version) {
    return DEFAULT_VERSION
  }

  return manifest.version
}
