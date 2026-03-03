import { createRequire } from 'node:module'

import type { InlineConfig } from 'tsdown'

import { createAutoloadPlugin } from './autoload-plugin.js'
import { ALWAYS_BUNDLE, NODE_BUILTINS, SHEBANG } from './constants.js'
import type { ResolvedBundlerConfig } from './types.js'

/**
 * Map a resolved bundler config to a tsdown InlineConfig for production builds.
 *
 * @param config - The fully resolved bundler config.
 * @returns A tsdown InlineConfig ready for `build()`.
 */
export function mapToBuildConfig(config: ResolvedBundlerConfig): InlineConfig {
  return {
    banner: SHEBANG,
    clean: true,
    config: false,
    cwd: config.cwd,
    deps: {
      alwaysBundle: ALWAYS_BUNDLE,
      neverBundle: buildExternals(config.build.external),
    },
    dts: false,
    entry: { index: config.entry },
    format: 'esm',
    inputOptions: {
      resolve: {
        mainFields: ['module', 'main'],
      },
    },
    logLevel: 'info',
    minify: config.build.minify,
    outDir: config.buildOutDir,
    outputOptions: {
      codeSplitting: false,
    },
    platform: 'node',
    plugins: [
      createAutoloadPlugin({
        commandsDir: config.commands,
        tagModulePath: resolveTagModulePath(),
      }),
    ],
    sourcemap: config.build.sourcemap,
    target: config.build.target,
    treeshake: true,
  }
}

/**
 * Map a resolved bundler config to a tsdown InlineConfig for watch mode.
 *
 * @param params - The resolved config and optional success callback.
 * @returns A tsdown InlineConfig with `watch: true`.
 */
export function mapToWatchConfig(params: {
  readonly config: ResolvedBundlerConfig
  readonly onSuccess?: () => void | Promise<void>
}): InlineConfig {
  const buildConfig = mapToBuildConfig(params.config)

  return {
    ...buildConfig,
    onSuccess: params.onSuccess,
    watch: true,
  }
}

// ---------------------------------------------------------------------------

/**
 * Combine Node.js builtins with user-specified externals.
 *
 * @private
 * @param userExternals - Additional packages to mark as external.
 * @returns Combined array of externals for tsdown's `deps.neverBundle`.
 */
function buildExternals(userExternals: readonly string[]): (string | RegExp)[] {
  return [...NODE_BUILTINS, ...userExternals]
}

/**
 * Resolve the absolute file path to the `@kidd/utils/tag` module.
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
  return require.resolve('@kidd/utils/tag')
}
