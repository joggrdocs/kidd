import pc from 'picocolors'
import { match } from 'ts-pattern'

import type { InlineSummaryInput, SummaryInput, TallySummaryInput } from './types.js'

/**
 * Format a summary block.
 *
 * - `style: 'tally'` renders labeled stat rows aligned in a block.
 * - `style: 'inline'` renders a pipe-separated one-liner.
 *
 * @param input - The summary data to format.
 * @returns A formatted summary string.
 */
export function formatSummary(input: SummaryInput): string {
  return match(input)
    .with({ style: 'tally' }, formatTallySummary)
    .with({ style: 'inline' }, formatInlineSummary)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format a tally-style summary with labeled stat rows.
 *
 * @private
 * @param input - The tally summary data.
 * @returns A formatted tally block string.
 */
function formatTallySummary(input: TallySummaryInput): string {
  const maxWidth = input.stats.reduce((max, stat) => Math.max(max, stat.label.length), 0)

  return input.stats.map((stat) => `  ${stat.label.padEnd(maxWidth)}  ${stat.value}`).join('\n')
}

/**
 * Format an inline-style summary as a pipe-separated one-liner.
 *
 * @private
 * @param input - The inline summary data.
 * @returns A formatted summary line string.
 */
function formatInlineSummary(input: InlineSummaryInput): string {
  return `  ${input.stats.join(pc.gray(' | '))}`
}
