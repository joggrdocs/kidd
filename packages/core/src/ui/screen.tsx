import { withTag } from '@kidd-cli/utils/tag'
import type { ComponentType } from 'react'
import React from 'react'

import type { Context } from '../context/types.js'
import type { ArgsDef, Command, InferArgsMerged, Resolvable } from '../types/index.js'
import { KiddProvider } from './provider.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Exit behavior for a screen.
 *
 * - `'manual'` (default) — the screen stays alive until the component calls
 *   `useApp().exit()` or the user presses Ctrl-C.
 * - `'auto'` — the runtime calls `exit()` automatically once the component
 *   unmounts or the render tree settles.
 */
export type ScreenExit = 'auto' | 'manual'

/**
 * Definition passed to `screen()`.
 *
 * @typeParam TOptionsDef - Option (flag) definitions type.
 * @typeParam TPositionalsDef - Positional argument definitions type.
 */
export interface ScreenDef<
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
> {
  /**
   * Explicit command name. Overrides the filename-derived name from autoload.
   */
  readonly name?: string

  /**
   * Alternative names for this screen command.
   */
  readonly aliases?: readonly string[]

  /**
   * Human-readable description shown in help text.
   */
  readonly description?: Resolvable<string>

  /**
   * When `true`, the screen command is hidden from help output.
   */
  readonly hidden?: Resolvable<boolean>

  /**
   * Marks the screen command as deprecated.
   */
  readonly deprecated?: Resolvable<string | boolean>

  /**
   * Option (flag) definitions — zod object schema (recommended) or yargs-native format.
   */
  readonly options?: TOptionsDef

  /**
   * Positional argument definitions — zod object schema (recommended) or yargs-native format.
   */
  readonly positionals?: TPositionalsDef

  /**
   * Exit behavior. Defaults to `'manual'`.
   */
  readonly exit?: ScreenExit

  /**
   * A React component that receives the parsed args as props.
   *
   * Can be a component reference (`render: MyComponent`) or an inline
   * function (`render: (args) => <MyComponent {...args} />`).
   */
  readonly render: ComponentType<InferArgsMerged<TOptionsDef, TPositionalsDef>>
}

/**
 * Define a screen command that renders a React/Ink TUI.
 *
 * The `render` property accepts a React component that receives the
 * parsed args as props. The full command context — including any
 * middleware-decorated properties — is available via `useCommandContext()`.
 *
 * @param def - Screen definition including description, options, exit behavior, and render component.
 * @returns A tagged Command object compatible with the kidd autoloader and command map.
 */
export function screen<
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
>(def: ScreenDef<TOptionsDef, TPositionalsDef>): Command {
  const exitMode = def.exit ?? 'manual'
  const ScreenComponent = def.render as ComponentType<Record<string, unknown>>

  const renderFn = async (ctx: Context): Promise<void> => {
    const { render: inkRender } = await import('ink')

    const instance = inkRender(
      <KiddProvider value={ctx}>
        <ScreenComponent {...ctx.args} />
      </KiddProvider>
    )

    if (exitMode === 'auto') {
      const { unmount } = instance
      setTimeout(() => {
        unmount()
      }, 0)
    }

    await instance.waitUntilExit()
  }

  return withTag(
    {
      aliases: def.aliases,
      deprecated: resolveValue(def.deprecated),
      description: resolveValue(def.description),
      hidden: resolveValue(def.hidden),
      name: def.name,
      options: def.options,
      positionals: def.positionals,
      render: renderFn,
    },
    'Command'
  ) as Command
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve a {@link Resolvable} value.
 *
 * @private
 */
function resolveValue<T>(value: Resolvable<T> | undefined): T | undefined {
  if (typeof value === 'function') {
    return (value as () => T)()
  }
  return value
}
