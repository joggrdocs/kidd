import { relative } from 'node:path'

import { build, compile, resolveTargetLabel } from '@kidd-cli/bundler'
import type { CompiledBinary } from '@kidd-cli/bundler'
import type { CompileTarget, KiddConfig } from '@kidd-cli/config'
import { loadConfig } from '@kidd-cli/config/loader'
import { command } from '@kidd-cli/core'
import type { Command, Context } from '@kidd-cli/core'
import { z } from 'zod'

import { extractConfig } from '../lib/config-helpers.js'

const options = z.object({
  compile: z.boolean().optional().describe('Compile to standalone binaries after bundling'),
  targets: z.array(z.string()).optional().describe('Compile targets (implies --compile)'),
})

type BuildArgs = z.infer<typeof options>

/**
 * Build a kidd CLI project for production using tsdown.
 *
 * Loads the project's `kidd.config.ts`, invokes the bundler, and reports
 * the output entry file and directory on success. When `--compile` or
 * `--targets` is provided (or `compile` is set in config), also compiles
 * to standalone binaries via Bun.
 */
const buildCommand: Command = command({
  options,
  description: 'Build a kidd CLI project for production',
  handler: async (ctx: Context<BuildArgs>) => {
    const cwd = process.cwd()

    const [, configResult] = await loadConfig({ cwd })
    const config = extractConfig(configResult)

    ctx.spinner.start('Bundling with tsdown...')

    const [buildError, buildOutput] = await build({ config, cwd })

    if (buildError) {
      ctx.spinner.stop('Bundle failed')
      return ctx.fail(buildError.message)
    }

    const shouldCompile = resolveCompileIntent({
      compileFlag: ctx.args.compile,
      configCompile: config.compile,
      targets: ctx.args.targets,
    })

    if (!shouldCompile) {
      ctx.spinner.stop('Build complete')
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

    ctx.spinner.message('Bundled, compiling binaries...')

    const mergedConfig = mergeCompileTargets({ config, targets: ctx.args.targets })
    const [compileError, compileOutput] = await compile({
      config: mergedConfig,
      cwd,
      onTargetComplete: (target) => ctx.spinner.message(`Compiled ${resolveTargetLabel(target)}`),
      onTargetStart: (target) => ctx.spinner.message(`Compiling ${resolveTargetLabel(target)}...`),
    })

    if (compileError) {
      ctx.spinner.stop('Compile failed')
      return ctx.fail(compileError.message)
    }

    ctx.spinner.stop('Build complete')
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
 * When targets are provided via CLI, they override whatever is in config.
 * Otherwise the config is returned unchanged.
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
 * Returns the object as-is when it is an object, or an empty object
 * for boolean / undefined values.
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
