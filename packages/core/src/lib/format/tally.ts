import pc from 'picocolors'
import { match } from 'ts-pattern'

import type { TallyBlockInput, TallyInlineInput, TallyInput } from './types.js'

/**
 * Format a tally block.
 *
 * - `style: 'tally'` renders labeled stat rows aligned in a block.
 * - `style: 'inline'` renders a pipe-separated one-liner.
 *
 * @param input - The tally data to format.
 * @returns A formatted tally string.
 */
export function formatTally(input: TallyInput): string {
  return match(input)
    .with({ style: 'tally' }, formatTallyBlock)
    .with({ style: 'inline' }, formatTallyInline)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format a tally block with labeled stat rows.
 *
 * @private
 * @param input - The tally block data.
 * @returns A formatted tally block string.
 */
function formatTallyBlock(input: TallyBlockInput): string {
  const maxWidth = input.stats.reduce((max, stat) => Math.max(max, stat.label.length), 0)

  return input.stats.map((stat) => `  ${stat.label.padEnd(maxWidth)}  ${stat.value}`).join('\n')
}

/**
 * Format a tally inline as a pipe-separated one-liner.
 *
 * @private
 * @param input - The tally inline data.
 * @returns A formatted tally line string.
 */
function formatTallyInline(input: TallyInlineInput): string {
  return `  ${input.stats.join(pc.gray(' | '))}`
}
