/**
 * Shape of the Unicode glyphs object.
 */
export interface Glyphs {
  readonly check: '\u2713'
  readonly cross: '\u2717'
  readonly warning: '\u26A0'
  readonly dash: '\u2500'
  readonly dot: '\u00B7'
  readonly arrow: '\u203A'
  readonly skip: '\u25CB'
  readonly fix: '\u2699'
  readonly pipe: '\u2502'
  readonly corner: '\u2570'
}

/**
 * Unicode glyphs used in formatted output, frozen for immutability.
 */
export const GLYPHS: Glyphs = Object.freeze({
  arrow: '\u203A',
  check: '\u2713',
  corner: '\u2570',
  cross: '\u2717',
  dash: '\u2500',
  dot: '\u00B7',
  fix: '\u2699',
  pipe: '\u2502',
  skip: '\u25CB',
  warning: '\u26A0',
})
