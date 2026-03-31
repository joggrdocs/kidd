import { readFileSync } from 'node:fs'

import { createAutoloadPlugin } from '../autoloader/autoload-plugin.js'
import { createExternalsPlugin, createStubPlugin } from './plugins.js'
import type { BunRunnerConfig } from './bun-config.js'

/**
 * Result written to stdout by the runner.
 */
interface RunnerResult {
  readonly success: boolean
  readonly entryFile: string | undefined
  readonly errors: readonly string[]
}

/**
 * Entry point for the Bun subprocess runner.
 *
 * Reads a JSON config file path from argv, constructs Bun plugins, invokes
 * `Bun.build()`, and writes a JSON result to stdout. Exits with code 0 on
 * success, 1 on failure.
 *
 * @private
 */
async function main(): Promise<void> {
  const configPath = process.argv[2]
  if (!configPath) {
    writeResult({ entryFile: undefined, errors: ['no config path provided'], success: false })
    process.exit(1)
  }

  const config: BunRunnerConfig = JSON.parse(readFileSync(configPath, 'utf-8'))

  const plugins = [
    createAutoloadPlugin({
      commandsDir: config.commandsDir,
      coreDistPath: config.coreDistPath,
      tagModulePath: config.tagModulePath,
    }),
    createExternalsPlugin({
      alwaysBundlePatterns: config.alwaysBundlePatterns,
      compile: config.compile,
      external: config.external,
      nodeBuiltins: config.nodeBuiltins,
    }),
    ...(config.compile ? [createStubPlugin(config.stubPackages)] : []),
  ]

  const result = await Bun.build({
    define: { ...config.define },
    entrypoints: [config.entry],
    external: [...config.nodeBuiltins, ...config.external],
    minify: config.minify,
    naming: '[dir]/[name].js',
    outdir: config.outDir,
    plugins,
    sourcemap: config.sourcemap ? 'linked' : 'none',
    splitting: false,
    target: 'node',
  })

  if (!result.success) {
    const errors = result.logs
      .filter((log) => log.level === 'error')
      .map((log) => log.message)

    writeResult({ entryFile: undefined, errors, success: false })
    process.exit(1)
  }

  const entryOutput = result.outputs.find((o) => o.kind === 'entry-point')
  const entryFile = entryOutput?.path

  writeResult({ entryFile, errors: [], success: true })
}

// ---------------------------------------------------------------------------

/**
 * Write a JSON result to stdout for the parent process to parse.
 *
 * @private
 * @param result - The runner result to serialize.
 */
function writeResult(result: RunnerResult): void {
  process.stdout.write(JSON.stringify(result))
}

await main()
