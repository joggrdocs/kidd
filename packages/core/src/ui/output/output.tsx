/**
 * React component that renders accumulated output entries from an
 * {@link OutputStore}. Used inside `screen()` components to display
 * `ctx.log`, `ctx.spinner`, and `ctx.report` output declaratively.
 *
 * @module
 */

import { Spinner } from '@inkjs/ui'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import { useSyncExternalStore } from 'react'
import { match } from 'ts-pattern'

import { formatCheck } from '@/lib/format/check.js'
import { formatFinding } from '@/lib/format/finding.js'
import { formatSummary } from '@/lib/format/tally.js'

import type { OutputEntry, OutputStore, SpinnerState } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Output} component.
 */
export interface OutputProps {
  /**
   * The output store to render entries from.
   */
  readonly store: OutputStore
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Render accumulated output entries and spinner state from an {@link OutputStore}.
 *
 * Subscribes to the store via `useSyncExternalStore` and re-renders
 * whenever new entries are pushed or spinner state changes.
 *
 * @param props - The output component props.
 * @returns A rendered output element.
 */
export function Output({ store }: OutputProps): ReactElement {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return (
    <Box flexDirection="column">
      <SpinnerRow state={snapshot.spinner} />
      {snapshot.entries.map((entry) => (
        <EntryRow key={`${entry.kind}-${String(entry.id)}`} entry={entry} />
      ))}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the spinner row based on current spinner state.
 *
 * @private
 */
function SpinnerRow({ state }: { readonly state: SpinnerState }): ReactElement | null {
  return match(state)
    .with({ status: 'idle' }, () => null)
    .with({ status: 'spinning' }, ({ message }) => <Spinner label={message} />)
    .with({ status: 'stopped' }, ({ message }) =>
      match(message.length > 0)
        .with(true, () => (
          <Text>
            <Text color="green">{'\u2713'}</Text> {message}
          </Text>
        ))
        .with(false, () => null)
        .exhaustive()
    )
    .exhaustive()
}

/**
 * Render a single output entry.
 *
 * @private
 */
function EntryRow({ entry }: { readonly entry: OutputEntry }): ReactElement {
  return match(entry)
    .with({ kind: 'log' }, (e) => <LogRow level={e.level} text={e.text} symbol={e.symbol} />)
    .with({ kind: 'raw' }, (e) => <Text>{e.text}</Text>)
    .with({ kind: 'newline' }, () => <Text> </Text>)
    .with({ kind: 'check' }, (e) => <Text>{formatCheck(e.input)}</Text>)
    .with({ kind: 'finding' }, (e) => <Text>{formatFinding(e.input)}</Text>)
    .with({ kind: 'summary' }, (e) => <Text>{formatSummary(e.input)}</Text>)
    .exhaustive()
}

/**
 * Render a log entry with the appropriate color and icon.
 *
 * @private
 */
function LogRow({
  level,
  text,
  symbol,
}: {
  readonly level: string
  readonly text: string
  readonly symbol?: string
}): ReactElement {
  return match(level)
    .with('info', () => (
      <Text>
        <Text color="blue">{'\u25CB'}</Text> {text}
      </Text>
    ))
    .with('success', () => (
      <Text>
        <Text color="green">{'\u2713'}</Text> {text}
      </Text>
    ))
    .with('error', () => (
      <Text>
        <Text color="red">{'\u2717'}</Text> {text}
      </Text>
    ))
    .with('warn', () => (
      <Text>
        <Text color="yellow">{'\u26A0'}</Text> {text}
      </Text>
    ))
    .with('step', () => (
      <Text>
        <Text color="cyan">{'\u25CB'}</Text> {text}
      </Text>
    ))
    .with('message', () => (
      <Text>
        {match(symbol)
          .with(undefined, () => '')
          .otherwise((s) => `${s} `)}
        {text}
      </Text>
    ))
    .otherwise(() => <Text>{text}</Text>)
}
