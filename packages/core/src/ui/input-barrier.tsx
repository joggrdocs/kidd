import { EventEmitter } from 'node:events'
import process from 'node:process'

// @ts-expect-error -- ink does not export this subpath in its exports map
import InkStdinContext from 'ink/build/components/StdinContext.js'
import type { Context, ReactElement, ReactNode } from 'react'
import { useMemo } from 'react'

// ---------------------------------------------------------------------------
// Ink StdinContext — static import so bundlers can resolve and inline it.
// ---------------------------------------------------------------------------

/**
 * Shape of the Ink stdin context value.
 *
 * @private
 */
interface StdinContextValue {
  readonly stdin: NodeJS.ReadStream
  readonly setRawMode: (value: boolean) => void
  readonly isRawModeSupported: boolean
  readonly internal_exitOnCtrlC: boolean
  readonly internal_eventEmitter: EventEmitter
}

const StdinContext = InkStdinContext as Context<StdinContextValue>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * No-op `setRawMode` used in the muted stdin context.
 *
 * @private
 */
function noop(): void {}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link InputBarrier} component.
 */
interface InputBarrierProps {
  /** Whether child input hooks should receive real stdin events. */
  readonly active: boolean
  /** The child elements to render. */
  readonly children: ReactNode
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Wrap children in a stdin context that silences `useInput` hooks when
 * `active` is `false`. When `active` is `true`, the real stdin context
 * passes through and hooks work normally.
 *
 * @param props - The input barrier props.
 * @returns A rendered element with the barrier-controlled stdin context.
 */
export function InputBarrier({ active, children }: InputBarrierProps): ReactElement {
  const silentContext = useMemo(
    () => ({
      stdin: process.stdin,
      // eslint-disable-next-line unicorn/prefer-event-target -- Ink's StdinContext requires EventEmitter
      internal_eventEmitter: new EventEmitter(),
      setRawMode: noop,
      isRawModeSupported: false,
      internal_exitOnCtrlC: false,
    }),
    []
  )

  if (active) {
    return children as ReactElement
  }

  return <StdinContext.Provider value={silentContext}>{children}</StdinContext.Provider>
}
