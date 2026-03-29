/**
 * Compile-time CLI version injected by the kidd bundler.
 *
 * Set via `define: { __KIDD_VERSION__: JSON.stringify(version) }` during
 * the tsdown build. Falls back to `undefined` when building outside the
 * kidd bundler pipeline.
 */
declare const __KIDD_VERSION__: string | undefined

/**
 * Type declaration for Ink's internal `StdinContext` module.
 *
 * This module is not part of Ink's public API but is required by
 * {@link InputBarrier} to override the stdin context for child components,
 * effectively muting their `useInput` hooks.
 */
declare module 'ink/build/components/StdinContext.js' {
  import type { EventEmitter } from 'node:events'
  import type { Context } from 'react'

  interface StdinContextProps {
    readonly stdin: NodeJS.ReadStream
    readonly setRawMode: (value: boolean) => void
    readonly isRawModeSupported: boolean
    readonly internal_exitOnCtrlC: boolean
    readonly internal_eventEmitter: EventEmitter
  }

  const StdinContext: Context<StdinContextProps>
  export default StdinContext
}
