import type { z } from 'zod'

// ---------------------------------------------------------------------------
// Generic type utilities
// ---------------------------------------------------------------------------

/**
 * Merge two types, with TBase overriding TOverride.
 */
export type Merge<TBase, TOverride> = Omit<TBase, keyof TOverride> & TOverride

/**
 * String keys of a record.
 */
export type StringKeyOf<TRecord> = Extract<keyof TRecord, string>

/**
 * A record with string keys and unknown values. Used as the default constraint
 * for args, config, and general-purpose record types throughout the framework.
 */
export type AnyRecord = Record<string, unknown>

/**
 * Recursively makes all properties readonly.
 * Primitives and functions pass through unchanged.
 * Arrays become readonly tuples, objects get readonly properties at every depth.
 */
export type DeepReadonly<TType> = TType extends (...args: unknown[]) => unknown
  ? TType
  : TType extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : TType extends object
      ? { readonly [Key in keyof TType]: DeepReadonly<TType[Key]> }
      : TType

/**
 * Detects the `any` type using the intersection trick.
 * `0 extends 1 & T` is only true when T is `any`.
 */
export type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Converts a union `A | B | C` to an intersection `A & B & C`
 * via the standard contravariant trick.
 */
export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never

/**
 * Extract the inferred output type from a zod schema, or fall back to a plain object.
 */
export type InferSchema<TSchema> = TSchema extends z.ZodType<infer TOutput> ? TOutput : AnyRecord

/**
 * Derive the config type from a Zod schema for use in module augmentation.
 *
 * Use this in a `declare module` block to keep `CliConfig` in sync with
 * your Zod config schema, eliminating manual type duplication:
 *
 * ```ts
 * import type { ConfigType } from '@kidd-cli/core'
 *
 * declare module '@kidd-cli/core' {
 *   interface CliConfig extends ConfigType<typeof configSchema> {}
 * }
 * ```
 */
export type ConfigType<TSchema extends z.ZodType> = z.infer<TSchema>
