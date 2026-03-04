import { builtinModules } from 'node:module'

import type { CompileTarget } from '@kidd-cli/config'

/**
 * Shebang line prepended to CLI entry files.
 */
export const SHEBANG = '#!/usr/bin/env node\n'

/**
 * Default entry point for the CLI source.
 */
export const DEFAULT_ENTRY = './src/index.ts'

/**
 * Default directory for CLI commands.
 */
export const DEFAULT_COMMANDS = './commands'

/**
 * Default build output directory.
 */
export const DEFAULT_OUT_DIR = './dist'

/**
 * Default Node.js target version for builds.
 */
export const DEFAULT_TARGET = 'node18'

/**
 * Default minification setting.
 */
export const DEFAULT_MINIFY = false

/**
 * Default source map generation setting.
 */
export const DEFAULT_SOURCEMAP = true

/**
 * Default binary name for compiled SEA output.
 */
export const DEFAULT_BINARY_NAME = 'cli'

/**
 * Default compile targets when none are explicitly configured.
 *
 * Covers Linux servers/CI, modern and Intel Macs, and Windows — roughly 95%
 * of developer environments.
 */
export const DEFAULT_COMPILE_TARGETS: readonly CompileTarget[] = [
  'darwin-arm64',
  'darwin-x64',
  'linux-x64',
  'windows-x64',
]

/**
 * Packages that must always be bundled into the output.
 *
 * The `@kidd-cli/core` framework and its internal `@kidd-cli/*` packages must be inlined
 * so the autoload plugin can intercept and replace the runtime autoloader
 * with a static version for compiled binaries.
 */
export const ALWAYS_BUNDLE: RegExp[] = [/^@?kidd/]

/**
 * Node.js builtin modules in both bare and `node:` prefixed forms.
 */
export const NODE_BUILTINS: readonly string[] = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]
