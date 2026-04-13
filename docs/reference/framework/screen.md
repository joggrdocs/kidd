# screen()

Define a command that renders a React/Ink terminal UI instead of running a handler.

Import from `@kidd-cli/core/ui`.

## ScreenDef

| Field         | Type                            | Default    | Description                                                           |
| ------------- | ------------------------------- | ---------- | --------------------------------------------------------------------- |
| `name`        | `string`                        | --         | Explicit command name (overrides filename-derived name from autoload) |
| `aliases`     | `readonly string[]`             | --         | Alternative names for this screen command                             |
| `description` | `Resolvable<string>`            | --         | Human-readable description shown in help text                         |
| `hidden`      | `Resolvable<boolean>`           | --         | When true, hidden from help output                                    |
| `deprecated`  | `Resolvable<string \| boolean>` | --         | Marks the screen command as deprecated                                |
| `options`     | `ArgsDef`                       | --         | Option (flag) definitions -- Zod schema or yargs-native format        |
| `positionals` | `ArgsDef`                       | --         | Positional argument definitions                                       |
| `exit`        | `ScreenExit`                    | `'manual'` | Exit behavior: `'manual'` or `'auto'`                                 |
| `render`      | `ComponentType<TArgs>`          | --         | React component receiving parsed args as props                        |

## ScreenExit

| Value      | Description                                                                     |
| ---------- | ------------------------------------------------------------------------------- |
| `'manual'` | Screen stays alive until `useApp().exit()` or Ctrl-C. Default.                  |
| `'auto'`   | Runtime calls exit automatically once the component unmounts or render settles. |

## Context hooks

Available inside screen components. Throw if used outside a `screen()` render tree.

| Hook                  | Returns          | Description                                                            |
| --------------------- | ---------------- | ---------------------------------------------------------------------- |
| `useScreenContext()`  | `ScreenContext`  | Full context including `args`, `meta`, `store`, `log`, `status`, and any middleware-decorated properties (`config`, `auth`, `icons`, etc.) |

## Layout components

Re-exported from Ink:

| Component   | Props type       | Description                             |
| ----------- | ---------------- | --------------------------------------- |
| `Box`       | `BoxProps`       | Flexbox layout container                |
| `Text`      | `TextProps`      | Text rendering with color, bold, italic |
| `Newline`   | `NewlineProps`   | Line break                              |
| `Spacer`    | --               | Flexible spacing                        |
| `Static`    | `StaticProps`    | Static content that is not re-rendered  |
| `Transform` | `TransformProps` | Render transform wrapper                |

## Input components

Re-exported from @inkjs/ui:

| Component       | Props type           | Description                          |
| --------------- | -------------------- | ------------------------------------ |
| `Select`        | `SelectProps`        | Single-choice selection list         |
| `MultiSelect`   | `MultiSelectProps`   | Multi-choice selection list          |
| `TextInput`     | `TextInputProps`     | Text input field                     |
| `PasswordInput` | `PasswordInputProps` | Masked text input for secrets        |
| `ConfirmInput`  | `ConfirmInputProps`  | Yes/no confirmation prompt           |
| `Spinner`       | `SpinnerProps`       | Animated spinner with optional label |

## Ink hooks

Re-exported from Ink:

| Hook                         | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `useApp()`                   | Access app instance (`exit()`, `waitUntilExit()`) |
| `useInput(handler)`          | Handle keyboard input                             |
| `useFocus(options)`          | Manage focus state                                |
| `useFocusManager()`          | Control focus programmatically                    |
| `useStdin()`                 | Access stdin stream                               |
| `useStdout()`                | Access stdout stream                              |
| `useStderr()`                | Access stderr stream                              |
| `useCursor()`                | Show/hide terminal cursor                         |
| `useIsScreenReaderEnabled()` | Detect screen reader                              |

## KiddProvider

Wraps screen components automatically. Not typically instantiated directly.

| Prop       | Type               | Description                            |
| ---------- | ------------------ | -------------------------------------- |
| `children` | `ReactNode`        | React tree to wrap                     |
| `value`    | `KiddContextValue` | Context containing config, meta, store |

## Types

Exported from `@kidd-cli/core/ui`:

| Type                | Description                                  |
| ------------------- | -------------------------------------------- |
| `ScreenDef`         | Definition object passed to `screen()`       |
| `ScreenExit`        | `'auto' \| 'manual'`                         |
| `ScreenRenderProps` | Internal props passed to the render function |
| `KiddProviderProps` | Props for the KiddProvider component         |
| `Option`            | Option type for Select/MultiSelect           |

## References

- [Screens](/docs/concepts/screens)
- [Build a CLI](/guides/build-a-cli)
- [Core](../packages/kidd)
