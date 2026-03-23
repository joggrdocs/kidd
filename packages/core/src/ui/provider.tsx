import type { ReactElement, ReactNode } from 'react'
import { createContext, useContext } from 'react'

import type { Meta, Store } from '../context/types.js'

/**
 * Internal context value shared via the KiddProvider.
 *
 * @private
 */
interface KiddContextValue {
  readonly config: Readonly<Record<string, unknown>>
  readonly meta: Readonly<Meta>
  readonly store: Store
}

/**
 * Props for the {@link KiddProvider} component.
 */
export interface KiddProviderProps {
  readonly children: ReactNode
  readonly value: KiddContextValue
}

const KiddContext = createContext<KiddContextValue | null>(null)

/**
 * Provider that injects kidd runtime values (config, meta, store) into
 * the React tree. Screens rendered by the kidd runtime are automatically
 * wrapped in this provider.
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
 * Read a value from the kidd context, throwing if used outside KiddProvider.
 *
 * @private
 * @returns The current kidd context value.
 */
function useKiddContext(): KiddContextValue {
  const ctx = useContext(KiddContext)
  if (!ctx) {
    throw new Error('useConfig/useMeta/useStore must be used inside a screen() component')
  }
  return ctx
}

/**
 * Access the validated CLI config from within a screen component.
 *
 * @returns The deeply-readonly config object.
 */
export function useConfig<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
>(): Readonly<TConfig> {
  return useKiddContext().config as Readonly<TConfig>
}

/**
 * Access CLI metadata (name, version, command path, dirs) from within a screen component.
 *
 * @returns The deeply-readonly meta object.
 */
export function useMeta(): Readonly<Meta> {
  return useKiddContext().meta
}

/**
 * Access the in-memory key-value store from within a screen component.
 *
 * @returns The store instance.
 */
export function useStore(): Store {
  return useKiddContext().store
}
