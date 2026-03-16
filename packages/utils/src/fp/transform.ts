/**
 * Normalize an unknown caught value into an Error instance.
 *
 * If already an Error, returns it as-is. Otherwise wraps via `new Error(String(value))`.
 *
 * @param value - The unknown value to normalize.
 * @returns An Error instance.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value
  }
  return new Error(String(value))
}
