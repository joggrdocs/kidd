import { createRequire } from 'node:module'
import { dirname } from 'node:path'

import { match } from 'ts-pattern'

import { ALWAYS_BUNDLE, NODE_BUILTINS, STUB_PACKAGES } from '../constants.js'
import type { ResolvedBundlerConfig } from '../types.js'

/**
 * Serializable configuration passed to the Bun runner subprocess via a JSON temp file.
 */
export interface BunRunnerConfig {
  readonly entry: string
  readonly outDir: string
  readonly commandsDir: string
  readonly tagModulePath: string
  readonly coreDistDir: string
  readonly minify: boolean
  readonly sourcemap: boolean
  readonly target: string
  readonly define: Readonly<Record<string, string>>
  readonly external: readonly string[]
  readonly compile: boolean
  readonly stubPackages: readonly string[]
  readonly alwaysBundlePatterns: readonly string[]
  readonly nodeBuiltins: readonly string[]
}

/**
 * Build a serializable runner config from a resolved bundler config.
 *
 * Resolves module paths and converts RegExp patterns to strings so the config
 * can be serialized as JSON for the Bun subprocess.
 *
 * @param params - The resolved config, version, and compile flag.
 * @returns A fully serializable config for the Bun runner.
 */
export function buildRunnerConfig(params: {
  readonly config: ResolvedBundlerConfig
  readonly version?: string
  readonly compile: boolean
}): BunRunnerConfig {
  return {
    alwaysBundlePatterns: ALWAYS_BUNDLE.map((re) => re.source),
    compile: params.compile,
    coreDistDir: resolveCoreDistDir(),
    define: buildDefine(params.version),
    entry: params.config.entry,
    external: [...params.config.build.external],
    minify: params.config.build.minify,
    nodeBuiltins: [...NODE_BUILTINS],
    outDir: params.config.buildOutDir,
    commandsDir: params.config.commands,
    sourcemap: params.config.build.sourcemap,
    stubPackages: [...STUB_PACKAGES],
    tagModulePath: resolveTagModulePath(),
    target: params.config.build.target,
  }
}

// ---------------------------------------------------------------------------

/**
 * Build the `define` map for compile-time constants.
 *
 * @private
 * @param version - The version string from package.json, or undefined.
 * @returns A define map for Bun.build.
 */
function buildDefine(version: string | undefined): Record<string, string> {
  return match(version)
    .with(undefined, () => ({}))
    .otherwise((resolvedVersion) => ({
      __KIDD_VERSION__: JSON.stringify(resolvedVersion),
    }))
}

/**
 * Resolve the absolute file path to the `@kidd-cli/utils/tag` module.
 *
 * @private
 * @returns The absolute file path to the tag module.
 */
function resolveTagModulePath(): string {
  const require = createRequire(import.meta.url)
  return require.resolve('@kidd-cli/utils/tag')
}

/**
 * Resolve the absolute path to the `@kidd-cli/core` dist directory.
 *
 * The core package's tsdown output splits code across multiple chunk files
 * (e.g. `cli-CirRkJ6N.js`). The autoload region marker may live in any chunk,
 * so we return the dist directory rather than a single entry file. The autoload
 * plugin uses this to match all files inside the directory.
 *
 * @private
 * @returns The absolute directory path containing core dist files.
 */
function resolveCoreDistDir(): string {
  const require = createRequire(import.meta.url)
  const entry = require.resolve('@kidd-cli/core')
  return dirname(entry)
}
