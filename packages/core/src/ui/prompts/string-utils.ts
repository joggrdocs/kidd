// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Remove a character at the given position in a string.
 *
 * @param str - The source string.
 * @param index - The character index to remove.
 * @returns The string with the character removed.
 */
export function removeCharAt(str: string, index: number): string {
  return str.slice(0, index) + str.slice(index + 1)
}

/**
 * Insert a character sequence at the given position in a string.
 *
 * @param str - The source string.
 * @param index - The position to insert at.
 * @param chars - The characters to insert.
 * @returns The string with the characters inserted.
 */
export function insertCharAt(str: string, index: number, chars: string): string {
  return str.slice(0, index) + chars + str.slice(index)
}
