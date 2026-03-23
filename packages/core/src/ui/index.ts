/**
 * UI components for building interactive terminal interfaces.
 *
 * Re-exports components from `@inkjs/ui` as the public UI surface for
 * `@kidd-cli/core`. Each component is a thin wrapper suitable for use
 * inside Ink-based CLI render trees.
 *
 * @module
 */

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
