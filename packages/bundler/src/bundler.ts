import { isNil } from 'es-toolkit'

import { build } from './build/build.js'
import { watch } from './build/watch.js'
import { compile } from './compile/compile.js'
import { resolveConfig } from './config/resolve-config.js'
import type {
  AsyncBundlerResult,
  BuildOutput,
  Bundler,
  BundlerLifecycle,
  CompileOutput,
  CompileOverrides,
  CreateBundlerParams,
  WatchOverrides,
} from './types.js'

/**
 * Create a bundler instance for a kidd CLI project.
 *
 * Resolves the config once at creation time. Each method (build, watch, compile)
 * shares the resolved config and fires lifecycle hooks at phase boundaries.
 * Per-call overrides replace base hooks for that invocation.
 *
 * @param params - The config, working directory, and optional lifecycle hooks.
 * @returns A bundler with build, watch, and compile methods.
 */
export function createBundler(params: CreateBundlerParams): Bundler {
  const resolved = resolveConfig({ config: params.config, cwd: params.cwd })
  const hasCompile = !isNil(params.config.compile)

  const baseLifecycle: BundlerLifecycle = {
    onFinish: params.onFinish,
    onStart: params.onStart,
    onStepFinish: params.onStepFinish,
    onStepStart: params.onStepStart,
  }

  return {
    build: async (): AsyncBundlerResult<BuildOutput> => {
      const lifecycle = resolveLifecycle(baseLifecycle)
      await lifecycle.onStart({ phase: 'build' })
      const result = await build({ compile: hasCompile, resolved })
      await lifecycle.onFinish({ phase: 'build' })
      return result
    },

    watch: async (overrides?: WatchOverrides): AsyncBundlerResult<void> => {
      const lifecycle = resolveLifecycle(baseLifecycle, overrides)
      await lifecycle.onStart({ phase: 'watch' })
      const result = await watch({ onSuccess: overrides?.onSuccess, resolved })
      await lifecycle.onFinish({ phase: 'watch' })
      return result
    },

    compile: async (overrides?: CompileOverrides): AsyncBundlerResult<CompileOutput> => {
      const lifecycle = resolveLifecycle(baseLifecycle, overrides)
      await lifecycle.onStart({ phase: 'compile' })
      const result = await compile({ lifecycle, resolved, verbose: overrides?.verbose })
      await lifecycle.onFinish({ phase: 'compile' })
      return result
    },
  }
}

// ---------------------------------------------------------------------------

/**
 * No-op async function used as default lifecycle hook.
 *
 * @private
 */
const noop = async (): Promise<void> => {}

/**
 * Merge base lifecycle hooks with per-call overrides.
 *
 * Per-call hooks replace base hooks (no chaining). Missing hooks
 * are filled with no-ops so callers don't need null checks.
 *
 * @private
 * @param base - The base lifecycle hooks from the factory.
 * @param overrides - Optional per-call hook overrides.
 * @returns A lifecycle with all hooks guaranteed to be defined.
 */
function resolveLifecycle(
  base: BundlerLifecycle,
  overrides?: BundlerLifecycle
): Required<BundlerLifecycle> {
  return {
    onFinish: overrides?.onFinish ?? base.onFinish ?? noop,
    onStart: overrides?.onStart ?? base.onStart ?? noop,
    onStepFinish: overrides?.onStepFinish ?? base.onStepFinish ?? noop,
    onStepStart: overrides?.onStepStart ?? base.onStepStart ?? noop,
  }
}
