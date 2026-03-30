import { createRequire } from 'node:module'

import { match } from 'ts-pattern'
import type { InlineConfig } from 'tsdown'

import { createAutoloadPlugin } from '../autoloader/autoload-plugin.js'
import { ALWAYS_BUNDLE, NODE_BUILTINS, SHEBANG } from '../constants.js'
import type { ResolvedBundlerConfig } from '../types.js'

/**
 * Map a resolved bundler config to a tsdown InlineConfig for production builds.
 *
 * @param params - The resolved config and optional version for compile-time injection.
 * @returns A tsdown InlineConfig ready for `build()`.
 */
export function mapToBuildConfig(params: {
  readonly config: ResolvedBundlerConfig
  readonly version?: string
}): InlineConfig {
  return {
    banner: SHEBANG,
    clean: false,
    config: false,
    cwd: params.config.cwd,
    define: buildDefine(params.version),
    deps: {
      alwaysBundle: ALWAYS_BUNDLE,
      neverBundle: buildExternals(params.config.build.external),
    },
    dts: false,
    entry: { index: params.config.entry },
    format: 'esm',
    inputOptions: {
      resolve: {
        mainFields: ['module', 'main'],
      },
    },
    logLevel: 'silent',
    minify: params.config.build.minify,
    outDir: params.config.buildOutDir,
    outputOptions: {
      codeSplitting: false,
    },
    platform: 'node',
    plugins: [
      createAutoloadPlugin({
        commandsDir: params.config.commands,
        tagModulePath: resolveTagModulePath(),
      }),
    ],
    sourcemap: params.config.build.sourcemap,
    target: params.config.build.target,
    treeshake: true,
  }
}

/**
 * Map a resolved bundler config to a tsdown InlineConfig for watch mode.
 *
 * @param params - The resolved config, optional version, and optional success callback.
 * @returns A tsdown InlineConfig with `watch: true`.
 */
export function mapToWatchConfig(params: {
  readonly config: ResolvedBundlerConfig
  readonly version?: string
  readonly onSuccess?: () => void | Promise<void>
}): InlineConfig {
  const buildConfig = mapToBuildConfig({ config: params.config, version: params.version })

  return {
    ...buildConfig,
    logLevel: 'error',
    onSuccess: params.onSuccess,
    watch: true,
  }
}

// ---------------------------------------------------------------------------

/**
 * Optional peer dependencies of `c12` (the config loader) that are behind
 * dynamic `import()` calls and never execute at runtime. Externalizing them
 * at the tsdown level strips the imports from the bundle so `bun build --compile`
 * does not attempt to resolve them in strict pnpm layouts (e.g. CI).
 */
const C12_OPTIONAL_DEPS: readonly string[] = ['chokidar', 'magicast', 'giget']

/**
 * Combine Node.js builtins, c12 optional deps, and user-specified externals.
 *
 * @private
 * @param userExternals - Additional packages to mark as external.
 * @returns Combined array of externals for tsdown's `deps.neverBundle`.
 */
function buildExternals(userExternals: readonly string[]): (string | RegExp)[] {
  return [...NODE_BUILTINS, ...C12_OPTIONAL_DEPS, ...userExternals]
}

/**
 * Build the `define` map for compile-time constants.
 *
 * Injects `__KIDD_VERSION__` when a version string is available so that
 * the runtime can auto-detect the CLI version without reading package.json.
 *
 * @private
 * @param version - The version string from package.json, or undefined.
 * @returns A define map for tsdown/rolldown.
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
 * The static autoloader virtual module imports `withTag` via this path.
 * Using an absolute path ensures rolldown can resolve the import from
 * inside the virtual module without relying on tsdown's `alwaysBundle`
 * heuristic, which virtual modules may bypass.
 *
 * @private
 * @returns The absolute file path to the tag module.
 */
function resolveTagModulePath(): string {
  const require = createRequire(import.meta.url)
  return require.resolve('@kidd-cli/utils/tag')
}
