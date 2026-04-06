import { join } from 'node:path'

import { err, isPlainObject, match, merge, ok } from '@kidd-cli/utils/fp'
import type { Result } from '@kidd-cli/utils/fp'
import { validate } from '@kidd-cli/utils/validate'
import type { ZodTypeAny } from 'zod'

import { decorateContext } from '@/context/decorate.js'
import type { CommandContext } from '@/context/types.js'
import { createConfigClient } from '@/lib/config/client.js'
import type { ConfigLoadResult } from '@/lib/config/types.js'
import { resolveGlobalPath } from '@/lib/project/paths.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type {
  ConfigHandle,
  ConfigLayer,
  ConfigLayerName,
  ConfigLoadCallOptions,
  ConfigLoadCallResult,
  ConfigMiddlewareOptions,
} from './types.js'

/**
 * Create a config middleware that decorates `ctx.config` with a lazy config handle.
 *
 * By default, config is loaded on-demand when `ctx.config.load()` is called.
 * With `eager: true`, config is loaded during the middleware pass and cached
 * so that subsequent `load()` calls return instantly.
 *
 * @param options - Config middleware options including schema, eager flag, and optional layers config.
 * @returns A Middleware that decorates ctx.config with a {@link ConfigHandle}.
 */
export function config<TSchema extends ZodTypeAny>(
  options: ConfigMiddlewareOptions<TSchema>
): Middleware {
  return middleware(async (ctx, next) => {
    const configName = options.name ?? ctx.meta.name
    const handle = createConfigHandle({ configName, ctx, options })

    decorateContext(ctx, 'config', handle)

    if (options.eager === true) {
      const loadOptions = match(options.layers)
        .with(true, (): ConfigLoadCallOptions => ({ layers: true }))
        .otherwise((): undefined => undefined)
      const [loadError] = await handle.load(loadOptions)

      if (loadError) {
        ctx.fail(`Failed to load config: ${loadError.message}`)
      }
    }

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Parameters for the config handle factory.
 *
 * @private
 */
interface ConfigHandleParams<TSchema extends ZodTypeAny> {
  readonly configName: string
  readonly ctx: CommandContext
  readonly options: ConfigMiddlewareOptions<TSchema>
}

/**
 * Create a closure-based config handle with lazy loading and caching.
 *
 * The handle reads config from disk on the first `load()` call and caches
 * the result. Subsequent calls return the cached value without re-reading.
 * Errors are not cached — a failed load can be retried.
 *
 * @private
 * @param params - The config name, context, and middleware options.
 * @returns A frozen {@link ConfigHandle} instance.
 */
function createConfigHandle<TSchema extends ZodTypeAny>(
  params: ConfigHandleParams<TSchema>
): ConfigHandle<unknown> {
  const { configName, ctx, options } = params
  const { schema } = options

  /* eslint-disable -- closure-scoped mutable cache is intentional */
  let cached: Result<ConfigLoadCallResult<unknown>> | null = null
  /* eslint-enable */

  /**
   * Load config based on the provided options.
   *
   * @private
   * @param callOptions - Resolution mode options.
   * @returns A Result tuple with the load result or an error.
   */
  async function load(
    callOptions?: ConfigLoadCallOptions
  ): Promise<Result<ConfigLoadCallResult<unknown>>> {
    if (cached !== null) {
      return cached
    }

    const result = await match(callOptions)
      .with({ layer: 'global' }, (opts) =>
        loadNamedLayer(configName, schema, opts.layer, ctx, options)
      )
      .with({ layer: 'project' }, (opts) =>
        loadNamedLayer(configName, schema, opts.layer, ctx, options)
      )
      .with({ layer: 'local' }, (opts) =>
        loadNamedLayer(configName, schema, opts.layer, ctx, options)
      )
      .with({ layers: true }, () => loadLayered(configName, schema, ctx, options))
      .otherwise(() => loadSingle(configName, schema))

    const [resultError] = result
    if (resultError === null) {
      cached = result
    }

    return result
  }

  return Object.freeze({ load })
}

/**
 * Load config from a single directory (cwd) and validate.
 *
 * Falls back to an empty config when no config file is found.
 *
 * @private
 * @param configName - The config file base name.
 * @param schema - Zod schema for validation.
 * @returns A Result tuple with the load result.
 */
async function loadSingle(
  configName: string,
  schema: ZodTypeAny
): Promise<Result<ConfigLoadCallResult<unknown>>> {
  const client = createConfigClient({ name: configName, schema })
  const [loadError, result] = await client.load()

  if (loadError) {
    return err(loadError)
  }

  if (!result) {
    return ok({ config: Object.freeze({}) })
  }

  return ok({ config: Object.freeze(result.config as Record<string, unknown>) })
}

/**
 * Load config from all three layer directories, merge, validate, and return.
 *
 * Layers are merged with local-wins precedence. Per-layer errors are captured
 * in layer metadata rather than halting the entire operation.
 *
 * @private
 * @param configName - The config file base name.
 * @param schema - Zod schema for validation.
 * @param ctx - The command context.
 * @param options - Middleware options with optional dir overrides.
 * @returns A Result tuple with the merged config and layer metadata.
 */
async function loadLayered<TSchema extends ZodTypeAny>(
  configName: string,
  schema: TSchema,
  ctx: CommandContext,
  options: ConfigMiddlewareOptions<TSchema>
): Promise<Result<ConfigLoadCallResult<unknown>>> {
  const globalDirName = options.dirs?.global ?? ctx.meta.dirs.global
  const localDirName = options.dirs?.local ?? ctx.meta.dirs.local

  const layerDirs: readonly { readonly name: ConfigLayerName; readonly dir: string }[] = [
    { dir: resolveGlobalPath({ dirName: globalDirName }), name: 'global' },
    { dir: process.cwd(), name: 'project' },
    { dir: join(process.cwd(), localDirName), name: 'local' },
  ]

  const client = createConfigClient({ name: configName, schema })
  const layerResults = await Promise.all(layerDirs.map((entry) => resolveLayer(client.load, entry)))

  const foundConfigs = layerResults
    .filter((layer) => layer.config !== null)
    .map((layer) => layer.config as Record<string, unknown>)

  if (foundConfigs.length === 0) {
    return ok({ config: Object.freeze({}), layers: Object.freeze(layerResults) })
  }

  const merged = foundConfigs.reduce(
    (acc, layerConfig) => merge(acc, layerConfig),
    {} as Record<string, unknown>
  )

  const [validationError, validated] = validate({
    createError: ({ message }) => new Error(`Invalid merged config:\n${message}`),
    params: merged,
    schema,
  })

  if (validationError) {
    return err(validationError)
  }

  return ok({
    config: Object.freeze(validated as Record<string, unknown>),
    layers: Object.freeze(layerResults),
  })
}

/**
 * Load config from a specific named layer directory and validate.
 *
 * @private
 * @param configName - The config file base name.
 * @param schema - Zod schema for validation.
 * @param layerName - The layer to load.
 * @param ctx - The command context.
 * @param options - Middleware options with optional dir overrides.
 * @returns A Result tuple with the validated config from the named layer.
 */
async function loadNamedLayer<TSchema extends ZodTypeAny>(
  configName: string,
  schema: TSchema,
  layerName: ConfigLayerName,
  ctx: CommandContext,
  options: ConfigMiddlewareOptions<TSchema>
): Promise<Result<ConfigLoadCallResult<unknown>>> {
  const globalDirName = options.dirs?.global ?? ctx.meta.dirs.global
  const localDirName = options.dirs?.local ?? ctx.meta.dirs.local

  const dir = match(layerName)
    .with('global', () => resolveGlobalPath({ dirName: globalDirName }))
    .with('project', () => process.cwd())
    .with('local', () => join(process.cwd(), localDirName))
    .exhaustive()

  const client = createConfigClient({ name: configName, schema })
  const [loadError, result] = await client.load(dir)

  if (loadError) {
    return err(loadError)
  }

  if (!result) {
    return ok({ config: Object.freeze({}) })
  }

  return ok({ config: Object.freeze(result.config as Record<string, unknown>) })
}

/**
 * Load config from a single layer directory for use in layered resolution.
 *
 * Per-layer load errors are captured in the layer metadata rather than
 * halting the entire middleware — a broken layer still participates in
 * the merge with a null config.
 *
 * @private
 * @param load - The config client's load function.
 * @param entry - The layer name and directory.
 * @returns A ConfigLayer with the loaded data or nulls.
 */
async function resolveLayer(
  load: (cwd?: string) => Promise<readonly [Error | null, ConfigLoadResult<unknown> | null]>,
  entry: { readonly name: ConfigLayerName; readonly dir: string }
): Promise<ConfigLayer> {
  const [loadError, result] = await load(entry.dir)

  if (loadError || !result) {
    return { config: null, filePath: null, format: null, name: entry.name }
  }

  const rawConfig = match(isPlainObject(result.config))
    .with(true, () => result.config as Record<string, unknown>)
    .otherwise(() => null)

  return {
    config: rawConfig,
    filePath: result.filePath,
    format: result.format,
    name: entry.name,
  }
}
