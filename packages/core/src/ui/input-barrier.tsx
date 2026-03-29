/**
 * Barrier component that isolates child `useInput` hooks from the global
 * stdin event emitter. When inactive, children receive a silent
 * {@link EventEmitter} so their input handlers never fire. When active,
 * the real stdin context passes through unchanged.
 *
 * This relies on Ink's internal `StdinContext` — the same context that
 * `useInput` and `useStdin` consume. Providing a replacement context
 * value with a silent emitter effectively mutes all input hooks in the
 * subtree without requiring component cooperation.
 *
 * @module
 */

import { EventEmitter } from 'node:events'
import process from 'node:process'

// eslint-disable-next-line import/no-unresolved -- internal Ink module, not re-exported from main entry
import StdinContext from 'ink/build/components/StdinContext.js'
import type { ReactElement, ReactNode } from 'react'
import { useMemo } from 'react'

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
