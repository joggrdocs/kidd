import { join } from 'node:path'

import { isPlainObject, merge } from '@kidd-cli/utils/fp'
import { validate } from '@kidd-cli/utils/validate'
import type { ZodTypeAny } from 'zod'

import { decorateContext } from '@/context/decorate.js'
import type { CommandContext } from '@/context/types.js'
import { createConfigClient } from '@/lib/config/client.js'
import type { ConfigLoadResult } from '@/lib/config/types.js'
import { resolveGlobalPath } from '@/lib/project/paths.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type { ConfigLayer, ConfigLayerName, ConfigMiddlewareOptions } from './types.js'

/**
 * Create a config middleware that loads, validates, and decorates `ctx.config`.
 *
 * In single mode (default), loads config from `cwd` using c12 two-pass resolution.
 * In layered mode (`layers: true`), discovers config at global, project, and local
 * directories, deep-merges with local-wins precedence, and validates the result.
 *
 * When layered mode is enabled, per-layer metadata is available on `ctx.raw.configLayers`.
 *
 * @param options - Config middleware options including schema and optional layers flag.
 * @returns A Middleware that decorates ctx.config.
 */
export function config<TSchema extends ZodTypeAny>(
  options: ConfigMiddlewareOptions<TSchema>
): Middleware {
  const { schema, layers } = options

  return middleware(async (ctx, next) => {
    const configName = options.name ?? ctx.meta.name

    if (layers === true) {
      await loadLayered(ctx, configName, schema, options)
    } else {
      await loadSingle(ctx, configName, schema)
    }

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Load config from a single directory (cwd) and decorate ctx.
 *
 * Surfaces load errors via `ctx.fail()`. Falls back to empty config only
 * when no config file is found.
 *
 * @private
 * @param ctx - The command context.
 * @param configName - The config file base name.
 * @param schema - Zod schema for validation.
 */
async function loadSingle(
  ctx: CommandContext,
  configName: string,
  schema: ZodTypeAny
): Promise<void> {
  const client = createConfigClient({ name: configName, schema })
  const [loadError, result] = await client.load()

  if (loadError) {
    ctx.fail(`Failed to load config: ${loadError.message}`)
  }

  if (!result) {
    decorateContext(ctx, 'config', Object.freeze({}))
    return
  }

  decorateContext(ctx, 'config', Object.freeze(result.config as Record<string, unknown>))
}

/**
 * Load config from global, project, and local directories, merge, and decorate ctx.
 *
 * Always attaches `configLayers` to ctx (via decorateContext) on every code path.
 * Surfaces validation errors via `ctx.fail()`.
 *
 * @private
 * @param ctx - The command context.
 * @param configName - The config file base name.
 * @param schema - Zod schema for validation.
 * @param options - Middleware options with optional dir overrides.
 */
async function loadLayered<TSchema extends ZodTypeAny>(
  ctx: CommandContext,
  configName: string,
  schema: TSchema,
  options: ConfigMiddlewareOptions<TSchema>
): Promise<void> {
  const globalDirName = options.dirs?.global ?? ctx.meta.dirs.global
  const localDirName = options.dirs?.local ?? ctx.meta.dirs.local

  const layerDirs: readonly { readonly name: ConfigLayerName; readonly dir: string }[] = [
    { dir: resolveGlobalPath({ dirName: globalDirName }), name: 'global' },
    { dir: process.cwd(), name: 'project' },
    { dir: join(process.cwd(), localDirName), name: 'local' },
  ]

  const client = createConfigClient({ name: configName, schema })
  const layerResults = await Promise.all(layerDirs.map((entry) => loadLayer(client.load, entry)))

  decorateContext(ctx, 'configLayers', Object.freeze(layerResults))

  const foundConfigs = layerResults
    .filter((layer) => layer.config !== null)
    .map((layer) => layer.config as Record<string, unknown>)

  if (foundConfigs.length === 0) {
    decorateContext(ctx, 'config', Object.freeze({}))
    return
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
    ctx.fail(`Config validation failed: ${validationError.message}`)
  }

  decorateContext(ctx, 'config', Object.freeze(validated as Record<string, unknown>))
}

/**
 * Load config from a single layer directory.
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
async function loadLayer(
  load: (cwd?: string) => Promise<readonly [Error | null, ConfigLoadResult<unknown> | null]>,
  entry: { readonly name: ConfigLayerName; readonly dir: string }
): Promise<ConfigLayer> {
  const [loadError, result] = await load(entry.dir)

  if (loadError || !result) {
    return { config: null, filePath: null, format: null, name: entry.name }
  }

  const rawConfig = isPlainObject(result.config) ? (result.config as Record<string, unknown>) : null

  return {
    config: rawConfig,
    filePath: result.filePath,
    format: result.format,
    name: entry.name,
  }
}
