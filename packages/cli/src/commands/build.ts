import { relative } from 'node:path'

import { createBundler } from '@kidd-cli/bundler'
import type { CompiledBinary } from '@kidd-cli/bundler'
import type { CompileTarget, KiddConfig } from '@kidd-cli/config'
import { loadConfig } from '@kidd-cli/config/utils'
import { command } from '@kidd-cli/core'
import type { Command, CommandContext } from '@kidd-cli/core'
import { z } from 'zod'

import { extractConfig } from '../lib/config-helpers.js'

const options = z.object({
  clean: z.boolean().optional().describe('Clean build artifacts before bundling (default: true)'),
  compile: z.boolean().optional().describe('Compile to standalone binaries after bundling'),
  targets: z.array(z.string()).optional().describe('Compile targets (implies --compile)'),
  verbose: z.boolean().optional().describe('Show detailed error output on compile failure'),
})

type BuildArgs = z.infer<typeof options>

/**
 * Build a kidd CLI project for production.
 *
 * Loads the project's `kidd.config.ts`, invokes the bundler, and reports
 * the output entry file and directory on success. When `--compile` or
 * `--targets` is provided (or `compile` is set in config), also compiles
 * to standalone binaries via Bun.
 */
const buildCommand: Command = command({
  options,
  description: 'Build a kidd CLI project for production',
  handler: async (ctx: CommandContext<BuildArgs>) => {
    const cwd = process.cwd()

    const [, configResult] = await loadConfig({ cwd })
    const config = mergeCleanOption({ config: extractConfig(configResult), clean: ctx.args.clean })

    const shouldCompile = resolveCompileIntent({
      compileFlag: ctx.args.compile,
      configCompile: config.compile,
      targets: ctx.args.targets,
    })

    const mergedConfig = shouldCompile
      ? mergeCompileTargets({ config, targets: ctx.args.targets })
      : config

    const bundler = await createBundler({
      config: mergedConfig,
      cwd,
      onStepStart: ({ meta }) =>
        ctx.status.spinner.message(`Compiling ${meta.label}...`),
      onStepFinish: ({ meta }) =>
        ctx.status.spinner.message(`Compiled ${meta.label}`),
    })

    ctx.status.spinner.start('Bundling...')

    const [buildError, buildOutput] = await bundler.build()

    if (buildError) {
      ctx.status.spinner.stop('Bundle failed')
      return ctx.fail(buildError.message)
    }

    if (!shouldCompile) {
      ctx.status.spinner.stop('Build complete')
      ctx.log.note(
        formatBuildNote({
          cwd,
          entryFile: buildOutput.entryFile,
          outDir: buildOutput.outDir,
          version: buildOutput.version,
        }),
        'Bundle'
      )
      return
    }

    ctx.status.spinner.message('Bundled, compiling binaries...')

    const [compileError, compileOutput] = await bundler.compile({
      verbose: ctx.args.verbose,
    })

    if (compileError) {
      ctx.status.spinner.stop('Compile failed')
      return ctx.fail(compileError.message)
    }

    ctx.status.spinner.stop('Build complete')
    ctx.log.note(
      formatBuildNote({
        cwd,
        entryFile: buildOutput.entryFile,
        outDir: buildOutput.outDir,
        version: buildOutput.version,
      }),
      'Bundle'
    )
    ctx.log.note(formatBinariesNote({ binaries: compileOutput.binaries, cwd }), 'Binaries')
  },
})

export default buildCommand

// ---------------------------------------------------------------------------

/**
 * Determine whether compilation should run based on CLI flags and config.
 *
 * Resolution order:
 * 1. `--targets` provided → compile (implied)
 * 2. `--compile` flag → use its boolean value
 * 3. Fall back to config `compile` field (truthy = compile)
 *
 * @private
 * @param params - The CLI flags and config compile field.
 * @returns Whether to run the compile step.
 */
function resolveCompileIntent(params: {
  readonly targets: readonly string[] | undefined
  readonly compileFlag: boolean | undefined
  readonly configCompile: boolean | KiddConfig['compile']
}): boolean {
  if (params.targets && params.targets.length > 0) {
    return true
  }

  if (params.compileFlag !== undefined) {
    return params.compileFlag
  }

  if (params.configCompile === true) {
    return true
  }

  if (typeof params.configCompile === 'object') {
    return true
  }

  return false
}

/**
 * Merge CLI `--targets` into the config's compile options.
 *
 * @private
 * @param params - The config and optional CLI targets.
 * @returns A config with compile targets merged in.
 */
function mergeCompileTargets(params: {
  readonly config: KiddConfig
  readonly targets: readonly string[] | undefined
}): KiddConfig {
  if (!params.targets || params.targets.length === 0) {
    return params.config
  }

  const existingCompile = resolveExistingCompile(params.config.compile)

  return {
    ...params.config,
    compile: {
      ...existingCompile,
      targets: params.targets as CompileTarget[],
    },
  }
}

/**
 * Extract compile options object from the config's compile field.
 *
 * @private
 * @param value - The raw compile config value.
 * @returns A compile options object.
 */
function resolveExistingCompile(
  value: boolean | KiddConfig['compile']
): Exclude<KiddConfig['compile'], boolean | undefined> {
  if (typeof value === 'object') {
    return value
  }

  return {}
}

/**
 * Merge the CLI `--clean` / `--no-clean` flag into the loaded config.
 *
 * @private
 * @param params - The loaded config and optional CLI clean flag.
 * @returns A config with the clean option merged in.
 */
function mergeCleanOption(params: {
  readonly config: KiddConfig
  readonly clean: boolean | undefined
}): KiddConfig {
  if (params.clean === undefined) {
    return params.config
  }

  return {
    ...params.config,
    build: {
      ...params.config.build,
      clean: params.clean,
    },
  }
}

/**
 * Format bundle output into a multi-line string for display.
 *
 * @private
 * @param params - The build output paths and working directory.
 * @returns A formatted string with entry and output directory.
 */
function formatBuildNote(params: {
  readonly entryFile: string
  readonly outDir: string
  readonly cwd: string
  readonly version: string | undefined
}): string {
  return [
    `entry    ${relative(params.cwd, params.entryFile)}`,
    `output   ${relative(params.cwd, params.outDir)}`,
    ...formatVersionLine(params.version),
  ].join('\n')
}

/**
 * Format a version line for the build note, if a version is available.
 *
 * @private
 * @param version - The version string, or undefined.
 * @returns A single-element array with the formatted line, or an empty array.
 */
function formatVersionLine(version: string | undefined): string[] {
  if (!version) {
    return []
  }

  return [`version  ${version}`]
}

/**
 * Format compiled binaries into an aligned, multi-line string for display.
 *
 * @private
 * @param params - The binaries and working directory for relative path resolution.
 * @returns A formatted string with one line per binary.
 */
function formatBinariesNote(params: {
  readonly binaries: readonly CompiledBinary[]
  readonly cwd: string
}): string {
  const maxLen = Math.max(...params.binaries.map((b) => b.label.length))

  return params.binaries
    .map((binary) => `${binary.label.padEnd(maxLen)}  ${relative(params.cwd, binary.path)}`)
    .join('\n')
}
