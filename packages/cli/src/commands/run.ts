import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

import { build, compile } from '@kidd-cli/bundler'
import type { BuildOutput, CompileOutput, CompiledBinary } from '@kidd-cli/bundler'
import type { CompileTarget, KiddConfig } from '@kidd-cli/config'
import { loadConfig } from '@kidd-cli/config/loader'
import { command } from '@kidd-cli/core'
import type { Command, CommandContext } from '@kidd-cli/core'
import { match } from 'ts-pattern'
import { z } from 'zod'

import { extractConfig } from '../lib/config-helpers.js'

const DEFAULT_ENTRY = './src/index.ts'

const EngineSchema = z.enum(['node', 'tsx', 'binary'])

const options = z.object({
  engine: EngineSchema.default('node').describe(
    'Runtime engine: node (built), tsx (source), or binary (compiled)'
  ),
  inspect: z.boolean().optional().describe('Enable the Node.js inspector (--inspect)'),
  'inspect-brk': z
    .boolean()
    .optional()
    .describe('Enable the Node.js inspector and break before user code starts (--inspect-brk)'),
  'inspect-port': z.number().optional().describe('Set the inspector port'),
  'inspect-wait': z
    .boolean()
    .optional()
    .describe('Enable the Node.js inspector and wait for debugger to attach (--inspect-wait)'),
  target: z.string().optional().describe('Compile target for binary engine (e.g. darwin-arm64)'),
})

type RunArgs = z.infer<typeof options>

/**
 * Run the current kidd CLI project.
 *
 * Supports three engines:
 * - `node` (default) — builds first, then runs `node dist/index.mjs`
 * - `tsx` — runs the source entry file directly via `tsx`
 * - `binary` — builds and compiles, then executes the compiled binary
 *
 * All unknown flags are forwarded to the executed CLI. Supports
 * `--inspect`, `--inspect-brk`, `--inspect-wait`, and `--inspect-port`
 * for attaching a debugger (node and tsx engines only).
 */
const runCommand: Command = command({
  options,
  strict: false,
  description: 'Run the current kidd CLI project',
  handler: async (ctx: CommandContext<RunArgs>) => {
    const cwd = process.cwd()

    const [, configResult] = await loadConfig({ cwd })
    const config = extractConfig(configResult)

    if (ctx.args.engine === 'binary' && hasInspectFlag(ctx.args)) {
      return ctx.fail(
        'Inspector flags are not supported with the binary engine. Use --engine=node or --engine=tsx instead.'
      )
    }

    const passthroughArgs = extractPassthroughArgs({ knownArgs: ctx.args })

    const exitCode = await match(ctx.args.engine)
      .with('node', () => runWithNode({ args: ctx.args, config, cwd, passthroughArgs, ctx }))
      .with('tsx', () => runWithTsx({ args: ctx.args, config, cwd, passthroughArgs, ctx }))
      .with('binary', () => runWithBinary({ args: ctx.args, config, cwd, passthroughArgs, ctx }))
      .exhaustive()

    if (exitCode !== 0) {
      return ctx.fail(`Process exited with code ${exitCode}`)
    }
  },
})

export default runCommand

// ---------------------------------------------------------------------------

/**
 * Build the project and run the bundled entry file with `node`.
 *
 * @private
 * @param params - Engine execution parameters.
 * @returns The exit code of the spawned process.
 */
async function runWithNode(params: EngineParams): Promise<number> {
  const buildOutput = await buildProject(params)
  const inspectFlags = buildInspectFlags(params.args)

  return spawnProcess({
    args: [...inspectFlags, buildOutput.entryFile, ...params.passthroughArgs],
    cmd: 'node',
    cwd: params.cwd,
  })
}

/**
 * Run the source entry file directly with `tsx`.
 *
 * @private
 * @param params - Engine execution parameters.
 * @returns The exit code of the spawned process.
 */
async function runWithTsx(params: EngineParams): Promise<number> {
  const entryFile = resolve(params.cwd, params.config.entry ?? DEFAULT_ENTRY)
  const inspectFlags = buildInspectFlags(params.args)

  return spawnProcess({
    args: [...inspectFlags, entryFile, ...params.passthroughArgs],
    cmd: 'tsx',
    cwd: params.cwd,
  })
}

/**
 * Build and compile the project, then execute the compiled binary.
 *
 * Requires compile targets to be configured in `kidd.config.ts` or
 * provided via `--target`. Resolves the current platform's binary
 * from the compile output.
 *
 * @private
 * @param params - Engine execution parameters.
 * @returns The exit code of the spawned process.
 */
async function runWithBinary(params: EngineParams): Promise<number> {
  const configWithTarget = applyTargetOverride({
    config: params.config,
    target: params.args.target,
  })

  if (!hasCompileTargets(configWithTarget)) {
    params.ctx.fail('No compile targets configured. Set targets in kidd.config.ts or use --target.')
  }

  await buildProject({ ...params, config: configWithTarget })

  params.ctx.spinner.message('Compiling binary...')

  const compileOutput = await compileProject({
    config: configWithTarget,
    ctx: params.ctx,
    cwd: params.cwd,
  })

  const binary = resolveBinary({
    compileOutput,
    ctx: params.ctx,
    target: params.args.target,
  })

  params.ctx.spinner.stop('Build complete')

  return spawnProcess({
    args: params.passthroughArgs,
    cmd: binary.path,
    cwd: params.cwd,
  })
}

/**
 * Parameters shared across all engine execution functions.
 *
 * @private
 */
interface EngineParams {
  readonly args: RunArgs
  readonly config: KiddConfig
  readonly ctx: CommandContext<RunArgs>
  readonly cwd: string
  readonly passthroughArgs: readonly string[]
}

/**
 * Build the project using the bundler and return the build output.
 *
 * Starts a spinner, invokes the build, and fails the command on error.
 *
 * @private
 * @param params - The config, cwd, and command context.
 * @returns The successful build output.
 */
async function buildProject(params: {
  readonly config: KiddConfig
  readonly ctx: CommandContext<RunArgs>
  readonly cwd: string
}): Promise<BuildOutput> {
  params.ctx.spinner.start('Building...')

  const [buildError, buildOutput] = await build({ config: params.config, cwd: params.cwd })

  if (buildError) {
    params.ctx.spinner.stop('Build failed')
    return params.ctx.fail(buildError.message)
  }

  params.ctx.spinner.stop('Built')

  return buildOutput
}

/**
 * Compile the project into standalone binaries.
 *
 * @private
 * @param params - The config, cwd, and command context.
 * @returns The successful compile output.
 */
async function compileProject(params: {
  readonly config: KiddConfig
  readonly ctx: CommandContext<RunArgs>
  readonly cwd: string
}): Promise<CompileOutput> {
  const [compileError, compileOutput] = await compile({
    config: params.config,
    cwd: params.cwd,
  })

  if (compileError) {
    params.ctx.spinner.stop('Compile failed')
    return params.ctx.fail(compileError.message)
  }

  return compileOutput
}

/**
 * Resolve the binary to execute from compile output.
 *
 * When `--target` is provided, finds the matching binary. Otherwise
 * uses the first (and typically only) binary from the output.
 *
 * @private
 * @param params - The compile output, optional target, and command context.
 * @returns The resolved compiled binary.
 */
function resolveBinary(params: {
  readonly compileOutput: CompileOutput
  readonly ctx: CommandContext<RunArgs>
  readonly target: string | undefined
}): CompiledBinary {
  if (params.target) {
    const binary = params.compileOutput.binaries.find((b) => b.target === params.target)

    if (!binary) {
      return params.ctx.fail(`No binary found for target "${params.target}"`)
    }

    return binary
  }

  const [firstBinary] = params.compileOutput.binaries

  if (!firstBinary) {
    return params.ctx.fail('Compile produced no binaries')
  }

  return firstBinary
}

/**
 * Check whether a config has compile targets set.
 *
 * @private
 * @param config - The kidd config to check.
 * @returns `true` when at least one compile target is configured.
 */
function hasCompileTargets(config: KiddConfig): boolean {
  if (typeof config.compile !== 'object') {
    return false
  }

  if (!config.compile.targets) {
    return false
  }

  return config.compile.targets.length > 0
}

/**
 * Apply a `--target` CLI override to the config's compile targets.
 *
 * @private
 * @param params - The config and optional target override.
 * @returns A config with the target override applied.
 */
function applyTargetOverride(params: {
  readonly config: KiddConfig
  readonly target: string | undefined
}): KiddConfig {
  if (!params.target) {
    return params.config
  }

  const existingCompile = resolveExistingCompile(params.config.compile)

  return {
    ...params.config,
    compile: {
      ...existingCompile,
      targets: [params.target as CompileTarget],
    },
  }
}

/**
 * Extract compile options from the config's compile field.
 *
 * Returns the object as-is when it is an object, or an empty object
 * for boolean / undefined values.
 *
 * @private
 * @param value - The raw compile config value.
 * @returns A compile options object.
 */
function resolveExistingCompile(
  value: KiddConfig['compile']
): Exclude<KiddConfig['compile'], boolean | undefined> {
  if (typeof value === 'object') {
    return value
  }

  return {}
}

/**
 * Extract passthrough arguments by filtering out known kidd run flags.
 *
 * Since `strict: false` allows unknown flags through, `ctx.args` contains
 * both known and unknown entries. This function collects everything from
 * `process.argv` that isn't a recognized `kidd run` flag.
 *
 * @private
 * @param params - The known parsed args.
 * @returns An array of arguments to forward to the user's CLI.
 */
function extractPassthroughArgs(params: { readonly knownArgs: RunArgs }): readonly string[] {
  const argv = process.argv.slice(2)
  const runIndex = argv.indexOf('run')

  if (runIndex === -1) {
    return []
  }

  const afterRun = argv.slice(runIndex + 1)

  return afterRun.filter((arg) => !isKnownFlag(arg, params.knownArgs))
}

/**
 * Known flag names for the `kidd run` command.
 *
 * @private
 */
const KNOWN_FLAGS = new Set([
  '--engine',
  '--inspect',
  '--inspect-brk',
  '--inspect-port',
  '--inspect-wait',
  '--target',
])

/**
 * Check whether a CLI argument is a known `kidd run` flag or its value.
 *
 * Handles both `--flag value` and `--flag=value` forms.
 *
 * @private
 * @param arg - The CLI argument to check.
 * @param knownArgs - The parsed known args for value matching.
 * @returns `true` when the argument is a known flag or a known flag's value.
 */
function isKnownFlag(arg: string, knownArgs: RunArgs): boolean {
  if (KNOWN_FLAGS.has(arg)) {
    return true
  }

  const eqIndex = arg.indexOf('=')
  if (eqIndex > 0) {
    const flagPart = arg.slice(0, eqIndex)
    return KNOWN_FLAGS.has(flagPart)
  }

  if (isValueOfPrecedingFlag(arg, knownArgs)) {
    return true
  }

  return false
}

/**
 * Check whether an argument is the value of a preceding flag.
 *
 * Matches values for `--engine`, `--inspect-port`, and `--target` by
 * comparing against the parsed known args.
 *
 * @private
 * @param arg - The CLI argument to check.
 * @param knownArgs - The parsed known args.
 * @returns `true` when the argument matches a known flag's value.
 */
function isValueOfPrecedingFlag(arg: string, knownArgs: RunArgs): boolean {
  if (arg.startsWith('-')) {
    return false
  }

  if (arg === knownArgs.engine) {
    return true
  }

  if (knownArgs['inspect-port'] !== undefined && arg === String(knownArgs['inspect-port'])) {
    return true
  }

  if (knownArgs.target !== undefined && arg === knownArgs.target) {
    return true
  }

  return false
}

/**
 * Check whether any inspector flag is set.
 *
 * @private
 * @param args - The parsed CLI args.
 * @returns `true` when any inspector flag is enabled.
 */
function hasInspectFlag(args: RunArgs): boolean {
  return args.inspect === true || args['inspect-brk'] === true || args['inspect-wait'] === true
}

/**
 * Build inspector-related Node.js flags from parsed CLI args.
 *
 * Only one inspector mode is active at a time, with `inspect-brk` taking
 * precedence over `inspect-wait`, which takes precedence over `inspect`.
 *
 * @private
 * @param args - The parsed CLI args.
 * @returns An array of inspector flags.
 */
function buildInspectFlags(args: RunArgs): readonly string[] {
  const flag = resolveInspectMode(args)

  if (!flag) {
    return []
  }

  return [formatInspectFlag(flag, args['inspect-port'])]
}

/**
 * Determine which inspector mode to use based on parsed CLI args.
 *
 * @private
 * @param args - The parsed CLI args.
 * @returns The inspector flag name, or `undefined` if none is active.
 */
function resolveInspectMode(args: RunArgs): string | undefined {
  if (args['inspect-brk']) {
    return 'inspect-brk'
  }

  if (args['inspect-wait']) {
    return 'inspect-wait'
  }

  if (args.inspect) {
    return 'inspect'
  }

  return undefined
}

/**
 * Format an inspector flag with an optional port.
 *
 * @private
 * @param flag - The inspector flag name (e.g. 'inspect', 'inspect-brk').
 * @param port - Optional port number.
 * @returns The formatted flag string.
 */
function formatInspectFlag(flag: string, port: number | undefined): string {
  if (port !== undefined) {
    return `--${flag}=${port}`
  }

  return `--${flag}`
}

/**
 * Spawn a process with the given command and arguments, inheriting stdio.
 *
 * Returns a promise that resolves to the exit code of the child process.
 *
 * @private
 * @param params - The command, arguments, and working directory.
 * @returns The exit code of the spawned process.
 */
function spawnProcess(params: {
  readonly cmd: string
  readonly args: readonly string[]
  readonly cwd: string
}): Promise<number> {
  return new Promise((_resolve) => {
    const child = spawn(params.cmd, [...params.args], {
      cwd: params.cwd,
      stdio: 'inherit',
    })

    child.on('close', (code) => {
      _resolve(code ?? 1)
    })
  })
}
