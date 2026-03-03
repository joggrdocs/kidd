import { match } from 'ts-pattern'
import type { Options as YargsOptions } from 'yargs'
import type { z } from 'zod'

/**
 * Type guard that checks whether a value is a zod object schema.
 *
 * @param args - The value to check.
 * @returns True when args is a ZodObject.
 */
export function isZodSchema(args: unknown): args is z.ZodObject<z.ZodRawShape> {
  return (
    typeof args === 'object' &&
    args !== null &&
    '_def' in args &&
    typeof (args as { _def: unknown })._def === 'object' &&
    (args as { _def: { type?: string } })._def !== null &&
    (args as { _def: { type?: string } })._def.type === 'object'
  )
}

/**
 * Convert an entire zod object schema into a record of yargs options.
 *
 * @param schema - The zod object schema.
 * @returns A record mapping field names to yargs option definitions.
 */
export function zodSchemaToYargsOptions(
  schema: z.ZodObject<z.ZodRawShape>
): Record<string, YargsOptions> {
  const shape = schema.shape as Record<string, z.ZodTypeAny>
  return Object.fromEntries(
    Object.entries(shape).map(([key, fieldSchema]): [string, YargsOptions] => [
      key,
      getZodTypeOption(fieldSchema),
    ])
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface ZodDef {
  type?: string
  innerType?: z.ZodTypeAny
  defaultValue?: unknown
}

interface ZodTypeInfo {
  defaultValue: unknown
  inner: z.ZodTypeAny
  isOptional: boolean
}

interface UnwrapOptions {
  def: ZodDef
  current: z.ZodTypeAny
  defaultValue: unknown
}

interface UnwrapRecursiveOptions {
  current: z.ZodTypeAny
  isOptional: boolean
  defaultValue: unknown
}

/**
 * Extract a default value from a zod definition, falling back to the provided value.
 *
 * @private
 * @param def - The zod definition to inspect.
 * @param fallback - Value to return when no default is defined.
 * @returns The resolved default value.
 */
function resolveDefaultValue(def: ZodDef, fallback: unknown): unknown {
  if (def.defaultValue !== undefined) {
    return def.defaultValue
  }
  return fallback
}

/**
 * Unwrap a ZodOptional type, recursing into the inner type.
 *
 * @private
 * @param options - The unwrap options containing def, current type, and default value.
 * @returns Unwrapped type information.
 */
function unwrapOptional(options: UnwrapOptions): ZodTypeInfo {
  const { def, current, defaultValue } = options
  if (def.innerType) {
    return unwrapZodTypeRecursive({ current: def.innerType, defaultValue, isOptional: true })
  }
  return { defaultValue, inner: current, isOptional: true }
}

/**
 * Unwrap a ZodDefault type, resolving its default value and recursing.
 *
 * @private
 * @param options - The unwrap options containing def, current type, and default value.
 * @returns Unwrapped type information with the resolved default.
 */
function unwrapDefault(options: UnwrapOptions): ZodTypeInfo {
  const { def, current, defaultValue } = options
  const newDefault = resolveDefaultValue(def, defaultValue)
  if (def.innerType) {
    return unwrapZodTypeRecursive({
      current: def.innerType,
      defaultValue: newDefault,
      isOptional: true,
    })
  }
  return { defaultValue: newDefault, inner: current, isOptional: true }
}

/**
 * Recursively unwrap optional and default wrappers from a zod type.
 *
 * @private
 * @param options - The recursive unwrap options containing current type, optionality flag, and default value.
 * @returns The fully unwrapped type information.
 */
function unwrapZodTypeRecursive(options: UnwrapRecursiveOptions): ZodTypeInfo {
  const { current, isOptional, defaultValue } = options
  const def = (current as { _def: ZodDef })._def
  if (def.type === 'optional') {
    return unwrapOptional({ current, def, defaultValue })
  }
  if (def.type === 'default') {
    return unwrapDefault({ current, def, defaultValue })
  }
  return { defaultValue, inner: current, isOptional }
}

/**
 * Unwrap a zod schema to extract its base type, optionality, and default value.
 *
 * @private
 * @param schema - The zod type to unwrap.
 * @returns The unwrapped type information.
 */
function unwrapZodType(schema: z.ZodTypeAny): ZodTypeInfo {
  return unwrapZodTypeRecursive({ current: schema, defaultValue: undefined, isOptional: false })
}

/**
 * Map a zod type name to a yargs option type string.
 *
 * @private
 * @param typeName - The zod type name (e.g. 'string', 'number').
 * @returns The corresponding yargs type.
 */
function resolveZodYargsType(
  typeName: string | undefined
): 'string' | 'number' | 'boolean' | 'array' {
  return match(typeName)
    .with('string', () => 'string' as const)
    .with('number', () => 'number' as const)
    .with('boolean', () => 'boolean' as const)
    .with('array', () => 'array' as const)
    .otherwise(() => 'string' as const)
}

/**
 * Build a base yargs option from a zod schema's description and default.
 *
 * @private
 * @param inner - The unwrapped zod schema instance.
 * @param defaultValue - The resolved default value.
 * @returns A partial yargs option object.
 */
function buildBaseOption(inner: z.ZodTypeAny, defaultValue: unknown): YargsOptions {
  const base: YargsOptions = {}
  const { description } = inner as { description?: string }
  if (description) {
    base.describe = description
  }
  if (defaultValue !== undefined) {
    base.default = defaultValue
  }
  return base
}

/**
 * Convert a single zod field schema into a complete yargs option definition.
 *
 * @private
 * @param schema - A single zod field type.
 * @returns A complete yargs option object.
 */
function getZodTypeOption(schema: z.ZodTypeAny): YargsOptions {
  const { inner, isOptional, defaultValue } = unwrapZodType(schema)
  const innerDef = (inner as { _def: ZodDef })._def
  const base = {
    ...buildBaseOption(inner, defaultValue),
    type: resolveZodYargsType(innerDef.type),
  }
  if (!isOptional) {
    return { ...base, demandOption: true }
  }
  return base
}
