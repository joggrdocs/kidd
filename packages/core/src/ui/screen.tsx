import process from 'node:process'

import { withTag } from '@kidd-cli/utils/tag'
import { omit } from 'es-toolkit'
import type { ComponentType } from 'react'
import React from 'react'
import { match } from 'ts-pattern'

import type { CommandContext, ImperativeContextKeys, ScreenContext } from '../context/types.js'
import type { ArgsDef, Command, InferArgsMerged, Resolvable } from '../types/index.js'
import { FullScreen, LEAVE_ALT_SCREEN } from './fullscreen.js'
import { KiddProvider } from './provider.js'

/**
 * Keys to strip from the full Context when creating the ScreenContext.
 *
 * @private
 */
const IMPERATIVE_KEYS: readonly ImperativeContextKeys[] = [
  'colors',
  'fail',
  'format',
  'log',
  'prompts',
  'spinner',
]

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
   * When `true`, the screen renders in the terminal's alternate screen
   * buffer (fullscreen mode). Preserves the user's scrollback history
   * and restores it on exit.
   */
  readonly fullscreen?: boolean

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
 * middleware-decorated properties — is available via `useScreenContext()`.
 *
 * @param def - Screen definition including description, options, exit behavior, and render component.
 * @returns A tagged Command object compatible with the kidd autoloader and command map.
 */
export function screen<
  TOptionsDef extends ArgsDef = ArgsDef,
  TPositionalsDef extends ArgsDef = ArgsDef,
>(def: ScreenDef<TOptionsDef, TPositionalsDef>): Command {
  const exitMode = def.exit ?? 'manual'
  const isFullscreen = def.fullscreen === true
  const ScreenComponent = def.render as ComponentType<Record<string, unknown>>

  const renderFn = async (ctx: CommandContext): Promise<void> => {
    const { render: inkRender } = await import('ink')
    const screenCtx = toScreenContext(ctx)

    const children = match(isFullscreen)
      .with(true, () => (
        <FullScreen>
          <ScreenComponent {...ctx.args} />
        </FullScreen>
      ))
      .with(false, () => <ScreenComponent {...ctx.args} />)
      .exhaustive()

    const instance = inkRender(<KiddProvider value={screenCtx}>{children}</KiddProvider>)

    if (exitMode === 'auto') {
      const { unmount } = instance
      setTimeout(() => {
        unmount()
      }, 0)
    }

    try {
      await instance.waitUntilExit()
    } finally {
      if (isFullscreen) {
        process.stdout.write(LEAVE_ALT_SCREEN)
      }
    }
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
 * Strip imperative I/O properties from a full {@link CommandContext} to produce
 * a {@link ScreenContext} safe for use inside React/Ink components.
 *
 * @private
 * @param ctx - The full command context.
 * @returns A ScreenContext with imperative keys removed.
 */
function toScreenContext(ctx: CommandContext): ScreenContext {
  return omit(ctx, [...IMPERATIVE_KEYS]) as unknown as ScreenContext
}

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
