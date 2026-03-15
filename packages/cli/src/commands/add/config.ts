import { join } from 'node:path'

import { command } from '@kidd-cli/core'
import type { Command, Context } from '@kidd-cli/core'
import { readManifest } from '@kidd-cli/utils/manifest'

import { detectProject } from '../../lib/detect.js'
import { renderTemplate } from '../../lib/render.js'
import { writeFiles } from '../../lib/write.js'

const addConfigCommand: Command = command({
  description: 'Add a config schema to your project',
  handler: async (ctx: Context) => {
    const cwd = process.cwd()

    const [detectError, project] = await detectProject(cwd)
    if (detectError) {
      return ctx.fail(detectError.message)
    }
    if (!project) {
      return ctx.fail('Not in a kidd project. Run `kidd init` first.')
    }

    const projectName = await resolveProjectName(project.rootDir)

    ctx.spinner.start('Generating config...')

    const templateDir = join(import.meta.dirname, '..', '..', 'lib', 'templates', 'config')
    const [renderError, rendered] = await renderTemplate({
      templateDir,
      variables: { name: projectName },
    })

    if (renderError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(renderError.message)
    }

    const outputDir = join(project.rootDir, 'src')
    const [writeError, result] = await writeFiles({ files: rendered, outputDir, overwrite: false })

    if (writeError) {
      ctx.spinner.stop('Failed')
      return ctx.fail(writeError.message)
    }

    ctx.spinner.stop('Config created!')

    const lines = [
      ...result.written.map((file) => `  created ${file}`),
      ...result.skipped.map((file) => `  skipped ${file} (already exists)`),
    ]
    const summary = lines.join('\n')
    if (summary.length > 0) {
      ctx.output.raw(summary)
    }

    ctx.output.raw('')
    ctx.output.raw('Next steps:')
    ctx.output.raw('  1. Add fields to the config schema in src/config.ts')
    ctx.output.raw('  2. Import and pass the schema to cli({ config: { schema: configSchema } })')
  },
})

export default addConfigCommand

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

const DEFAULT_NAME = 'my-app'

/**
 * Resolve the project name from the project's package.json.
 *
 * @param rootDir - The project root directory.
 * @returns The project name from package.json, or a default fallback.
 * @private
 */
async function resolveProjectName(rootDir: string): Promise<string> {
  const [error, manifest] = await readManifest(rootDir)
  if (error || !manifest.name) {
    return DEFAULT_NAME
  }
  return manifest.name
}
