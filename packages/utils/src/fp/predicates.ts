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

/**
 * Extract a human-readable message from an unknown caught value.
 *
 * If an Error, returns `error.message`. Otherwise returns `String(value)`.
 *
 * @param value - The unknown value to extract a message from.
 * @returns The error message string.
 */
export function toErrorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message
  }
  return String(value)
}
