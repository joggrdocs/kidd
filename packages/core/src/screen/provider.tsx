import type { ReactElement, ReactNode } from 'react'
import { createContext, useContext } from 'react'

import type { ScreenContext } from '../context/types.js'

const KiddContext = createContext<ScreenContext | null>(null)

/**
 * Props for the {@link KiddProvider} component.
 *
 * @private
 */
export interface KiddProviderProps {
  readonly children: ReactNode
  readonly value: ScreenContext
}

/**
 * Provider that injects the kidd screen context into the React tree.
 * Screens rendered by the kidd runtime are automatically wrapped in
 * this provider.
 *
 * @private
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
 * Access the command context from within a screen component.
 *
 * Returns a {@link ScreenContext} containing data properties (`args`,
 * `config`, `meta`, `store`), React-backed I/O (`log`, `spinner`),
 * and middleware-decorated properties (`auth`, `http`, `report`, etc.).
 *
 * `log` and `spinner` are automatically swapped with screen-safe
 * implementations that render through the `<Output />` component.
 * Middleware properties like `report` are also swapped when present.
 *
 * @returns The current screen context.
 */
export function useScreenContext<TContext extends ScreenContext = ScreenContext>(): TContext {
  const ctx = useContext(KiddContext)
  if (!ctx) {
    throw new Error('useScreenContext must be used inside a screen() component')
  }
  return ctx as TContext
}
