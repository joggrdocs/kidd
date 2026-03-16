/**
 * Unique symbol used as the property key for tagging objects.
 *
 * Non-enumerable when applied via {@link withTag}, so it does not appear in
 * `Object.keys`, `JSON.stringify`, or `for...in`. Use the symbol directly to
 * read the tag: `obj[TAG]`.
 */
export const TAG: unique symbol = Symbol('kidd.tag')

/**
 * Nominal type brand that carries a tag string on the {@link TAG} symbol property.
 *
 * @private
 */
interface NominalTag<TTag extends string> {
  readonly [TAG]: TTag
}

/**
 * Intersect a plain object type with a nominal tag brand.
 *
 * Used to brand plain data objects with a discriminator that is hidden from
 * enumeration, serialization, and spread — while remaining accessible via
 * the {@link TAG} symbol for runtime type-narrowing.
 */
export type Tagged<TObj extends object, TTag extends string> = TObj & NominalTag<TTag>

/**
 * Create a shallow copy of `obj` with a non-enumerable {@link TAG} property.
 *
 * The original object is not mutated. The tag is defined as non-enumerable,
 * non-writable, and non-configurable via `Object.defineProperty`.
 *
 * @param obj - The source object to copy and tag.
 * @param tag - The tag string to brand the copy with.
 * @returns A new object with all own enumerable properties of `obj` plus the hidden tag.
 */
export function withTag<TTag extends string, TObj extends object>(
  obj: TObj,
  tag: TTag
): Tagged<TObj, TTag> {
  const copy = { ...obj }
  Object.defineProperty(copy, TAG, {
    configurable: false,
    enumerable: false,
    value: tag,
    writable: false,
  })
  return copy as Tagged<TObj, TTag>
}

/**
 * Type guard that checks whether `value` carries the given tag.
 *
 * @param value - The value to inspect.
 * @param tag - The expected tag string.
 * @returns `true` when `value` is a non-null object whose `[TAG]` equals `tag`.
 */
export function hasTag<TTag extends string>(value: unknown, tag: TTag): value is NominalTag<TTag> {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return (value as Record<symbol, unknown>)[TAG] === tag
}

/**
 * Read the tag from a value, if present.
 *
 * @param value - The value to inspect.
 * @returns The tag string, or `undefined` when the value is untagged.
 */
export function getTag(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const tag = (value as Record<symbol, unknown>)[TAG]
  if (typeof tag === 'string') {
    return tag
  }
  return undefined
}
