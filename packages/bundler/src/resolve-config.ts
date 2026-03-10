import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { CompileOptions, KiddConfig } from '@kidd-cli/config'

import {
  DEFAULT_BINARY_NAME,
  DEFAULT_COMMANDS,
  DEFAULT_ENTRY,
  DEFAULT_MINIFY,
  DEFAULT_OUT_DIR,
  DEFAULT_SOURCEMAP,
  DEFAULT_TARGET,
} from './constants.js'
import type { ResolvedBundlerConfig } from './types.js'

/**
 * Known entry file names produced by tsdown for ESM builds, in preference order.
 */
const ENTRY_CANDIDATES = ['index.mjs', 'index.js'] as const

/**
 * Normalize the `compile` config field from `boolean | CompileOptions | undefined` to `CompileOptions`.
 *
 * - `true` → `{}` (compile with defaults)
 * - `false` / `undefined` → `{}` (no explicit options, caller decides whether to compile)
 * - object → pass through
 *
 * @param value - The raw compile config value.
 * @returns A normalized CompileOptions object.
 */
export function normalizeCompileOptions(
  value: boolean | CompileOptions | undefined
): CompileOptions {
  if (typeof value === 'object') {
    return value
  }

  return {}
}

/**
 * Fill defaults and resolve relative paths against `cwd`.
 *
 * This is a pure function — the incoming config is already validated by `@kidd-cli/config`.
 * It only fills missing optional fields with defaults and resolves paths to absolute.
 *
 * @param params - The raw config and working directory.
 * @returns A fully resolved bundler configuration.
 */
export function resolveConfig(params: {
  readonly config: KiddConfig
  readonly cwd: string
}): ResolvedBundlerConfig {
  const { config, cwd } = params

  const entry = resolve(cwd, config.entry ?? DEFAULT_ENTRY)
  const commands = resolve(cwd, config.commands ?? DEFAULT_COMMANDS)

  const buildOpts = config.build ?? {}
  const compileOpts = normalizeCompileOptions(config.compile)

  const buildOutDir = resolve(cwd, buildOpts.out ?? DEFAULT_OUT_DIR)
  const compileOutDir = resolve(cwd, compileOpts.out ?? DEFAULT_OUT_DIR)

  return {
    build: {
      external: buildOpts.external ?? [],
      minify: buildOpts.minify ?? DEFAULT_MINIFY,
      sourcemap: buildOpts.sourcemap ?? DEFAULT_SOURCEMAP,
      target: buildOpts.target ?? DEFAULT_TARGET,
    },
    buildOutDir,
    commandOrder: config.commandOrder ?? [],
    commands,
    compile: {
      name: compileOpts.name ?? DEFAULT_BINARY_NAME,
      targets: compileOpts.targets ?? [],
    },
    compileOutDir,
    cwd,
    entry,
    include: config.include ?? [],
  }
}

/**
 * Detect the bundled entry file in a build output directory.
 *
 * tsdown may produce `index.mjs` or `index.js` depending on the project's
 * `package.json` `type` field and tsdown configuration. This function checks
 * for both candidates and returns the first one that exists on disk.
 *
 * @param outDir - Absolute path to the build output directory.
 * @returns The absolute path to the entry file, or `undefined` when none is found.
 */
export function detectBuildEntry(outDir: string): string | undefined {
  return ENTRY_CANDIDATES.map((name) => join(outDir, name)).find(existsSync)
}
