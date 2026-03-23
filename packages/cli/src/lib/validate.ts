export const KEBAB_CASE_CHARS_RE: RegExp = /^[a-z][\da-z-]*$/

/**
 * Check whether a string is valid kebab-case.
 *
 * @param value - The string to validate.
 * @returns True when the string is kebab-case.
 */
export function isKebabCase(value: string): boolean {
  if (!KEBAB_CASE_CHARS_RE.test(value)) {
    return false
  }
  if (value.endsWith('-')) {
    return false
  }
  if (value.includes('--')) {
    return false
  }
  return true
}
