/**
 * UI components for building interactive terminal interfaces.
 *
 * Re-exports primitives from `ink` and higher-level components from
 * `@inkjs/ui` as the public UI surface for `@kidd-cli/core`.
 *
 * @module
 */

export {
  Box,
  kittyFlags,
  kittyModifiers,
  measureElement,
  Newline,
  Spacer,
  Static,
  Text,
  Transform,
  useApp,
  useCursor,
  useFocus,
  useFocusManager,
  useInput,
  useIsScreenReaderEnabled,
  useStderr,
  useStdin,
  useStdout,
} from 'ink'
export type {
  AppProps,
  BoxProps,
  CursorPosition,
  DOMElement,
  Key,
  KittyFlagName,
  KittyKeyboardOptions,
  NewlineProps,
  StaticProps,
  StderrProps,
  StdinProps,
  StdoutProps,
  TextProps,
  TransformProps,
} from 'ink'

export { ConfirmInput } from './confirm.js'
export type { ConfirmInputProps } from './confirm.js'

export { MultiSelect } from './multi-select.js'
export type { MultiSelectProps } from './multi-select.js'

export { PasswordInput } from './password-input.js'
export type { PasswordInputProps } from './password-input.js'

export { Select } from './select.js'
export type { SelectProps } from './select.js'

export { Spinner } from './spinner.js'
export type { SpinnerProps } from './spinner.js'

export { TextInput } from './text-input.js'
export type { TextInputProps } from './text-input.js'

export type { Option } from '@inkjs/ui'

export { useScreenContext } from './provider.js'
export type { ScreenContext } from '../context/types.js'

export { FullScreen, useFullScreen, useTerminalSize } from './fullscreen.js'
export type { FullScreenProps, FullScreenState, TerminalSize } from './fullscreen.js'

export { ScrollArea } from './scroll-area.js'
export type { ScrollAreaProps } from './scroll-area.js'

export { Tabs } from './tabs.js'
export type { TabItem, TabsProps } from './tabs.js'

export { useSize } from './use-size.js'
export type { Size } from './use-size.js'

export { Output, useOutputStore } from './output/index.js'
export type { OutputStore } from './output/index.js'

export { screen } from './screen.js'
export type { ScreenDef, ScreenExit } from './screen.js'

export { useKeyBinding } from './use-key-binding.js'
export type { KeyBinding, KeyBindingOptions, UseKeyBindingArgs } from './use-key-binding.js'

export { useKeyInput } from './use-key-input.js'
export type { KeyInputEvent, KeyInputOptions } from './use-key-input.js'
