import type { ReactElement, ReactNode } from 'react'
import { createContext, useContext } from 'react'

import type { Context } from '../context/types.js'

const KiddContext = createContext<Context | null>(null)

/**
 * Props for the {@link KiddProvider} component.
 */
export interface KiddProviderProps {
  readonly children: ReactNode
  readonly value: Context
}

/**
 * Provider that injects the kidd command context into the React tree.
 * Screens rendered by the kidd runtime are automatically wrapped in
 * this provider.
 *
 * @param props - Provider props containing the context value and children.
 * @returns A React element wrapping children with the kidd context.
 */
export function KiddProvider({ children, value }: KiddProviderProps): ReactElement {
  return <KiddContext.Provider value={value}>{children}</KiddContext.Provider>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the full command context from within a screen component.
 *
 * Returns the same {@link Context} object available in `command()` handlers,
 * including middleware-decorated properties such as `auth` and `http`.
 *
 * @returns The current command context.
 */
export function useCommandContext<TContext extends Context = Context>(): TContext {
  const ctx = useContext(KiddContext)
  if (!ctx) {
    throw new Error('useCommandContext must be used inside a screen() component')
  }
  return ctx as TContext
}
