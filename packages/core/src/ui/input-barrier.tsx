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
 * Ink does not export `StdinContext` in its public `exports` map, so a
 * direct static import (`ink/build/components/StdinContext.js`) is
 * blocked by Node.js module resolution at runtime. We resolve the
 * internal path dynamically via {@link import.meta.resolve} to bypass
 * the restriction while keeping the same context identity.
 *
 * @module
 */

import { EventEmitter } from 'node:events'
import process from 'node:process'

import type { Context, ReactElement, ReactNode } from 'react'
import { useMemo } from 'react'

// ---------------------------------------------------------------------------
// Ink StdinContext — resolved at module load time
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

/**
 * Resolve Ink's internal StdinContext by deriving its file path from the
 * main entry URL. A full file URL bypasses the `exports` restriction.
 *
 * @private
 * @returns The StdinContext React context object.
 */
async function resolveStdinContext(): Promise<Context<StdinContextValue>> {
  const inkEntryUrl = import.meta.resolve('ink')
  const stdinContextUrl = new URL('components/StdinContext.js', inkEntryUrl).href
  const mod = (await import(stdinContextUrl)) as { default: Context<StdinContextValue> }
  return mod.default
}

const StdinContext = await resolveStdinContext()

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
