import type { ZodType, ZodTypeAny, infer as ZodInfer } from 'zod'

import type { ConfigFormat } from '@/lib/config/types.js'
import type { DeepReadonly } from '@/types/index.js'

// ---------------------------------------------------------------------------
// Config layer types
// ---------------------------------------------------------------------------

/**
 * Names for configuration resolution layers.
 */
export type ConfigLayerName = 'global' | 'project' | 'local'

/**
 * Metadata for a single resolved configuration layer.
 */
export interface ConfigLayer {
  /** Which layer this config came from. */
  readonly name: ConfigLayerName
  /** Absolute path to the resolved config file, or null if not found. */
  readonly filePath: string | null
  /** The format of the resolved config file, or null if not found. */
  readonly format: ConfigFormat | null
  /** The raw config data loaded from this layer (pre-merge, pre-validation). */
  readonly config: Readonly<Record<string, unknown>> | null
}

// ---------------------------------------------------------------------------
// Middleware options
// ---------------------------------------------------------------------------

/**
 * Options for the config middleware factory.
 *
 * @typeParam TSchema - Zod schema type used to validate the loaded config.
 */
export interface ConfigMiddlewareOptions<TSchema extends ZodTypeAny> {
  /**
   * Zod schema to validate the loaded config. Infers `ctx.config` type.
   */
  readonly schema: TSchema
  /**
   * Override the config file base name. Default: derived from `ctx.meta.name`.
   */
  readonly name?: string
  /**
   * Enable layered config resolution with global > project > local merging.
   * When true, config files are discovered at three locations and deep-merged
   * with local-wins precedence. Default: false (single cwd resolution).
   */
  readonly layers?: boolean
  /**
   * Override layer directories. Only applies when `layers` is true.
   */
  readonly dirs?: {
    /** Override the global directory name. Default: `ctx.meta.dirs.global`. */
    readonly global?: string
    /** Override the local directory name. Default: `ctx.meta.dirs.local`. */
    readonly local?: string
  }
}

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/**
 * Derive the config type from a Zod schema for use in module augmentation.
 *
 * Use this in a `declare module` block to type `ctx.config` via the registry:
 *
 * ```ts
 * import type { ConfigType } from '@kidd-cli/core/config'
 *
 * declare module '@kidd-cli/core/config' {
 *   interface ConfigRegistry extends ConfigType<typeof configSchema> {}
 * }
 * ```
 */
export type ConfigType<TSchema extends ZodType> = DeepReadonly<ZodInfer<TSchema>>

/**
 * Registry interface for typed config. Consumers augment this to narrow `ctx.config`.
 *
 * When empty (no augmentation), `ctx.config` defaults to `DeepReadonly<Record<string, unknown>>`.
 * When augmented, `ctx.config` resolves to the augmented type.
 */
export interface ConfigRegistry {}

/**
 * Resolved config type. Falls back to a generic record when no augmentation is provided.
 */
export type ResolvedConfig = keyof ConfigRegistry extends never
  ? DeepReadonly<Record<string, unknown>>
  : ConfigRegistry[keyof ConfigRegistry]

// ---------------------------------------------------------------------------
// Module augmentation
// ---------------------------------------------------------------------------

declare module '@kidd-cli/core' {
  interface CommandContext {
    /**
     * Runtime config validated against the zod schema. Deeply immutable.
     * Added by the config middleware (`@kidd-cli/core/config`).
     */
    readonly config: ResolvedConfig
    /**
     * Per-layer config resolution metadata. Only present when layered
     * config resolution is enabled via `config({ layers: true })`.
     */
    readonly configLayers: readonly ConfigLayer[]
  }
}
