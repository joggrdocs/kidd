/**
 * Check whether debug mode is enabled via the `KIDD_DEBUG` environment variable.
 *
 * Truthy values: `"true"`, `"1"`
 * Falsy values: `"false"`, `"0"`, `undefined`, `null`
 *
 * @returns `true` when `KIDD_DEBUG` is set to a truthy value.
 */
export function isDebug(): boolean {
  const value = process.env.KIDD_DEBUG
  return value === 'true' || value === '1'
}
