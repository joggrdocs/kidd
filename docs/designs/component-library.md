# Component Library Design

> Design document for kidd's React/Ink UI component library with full clack-level API coverage.

## Context

kidd has two rendering paths:

1. **Handler mode** (`ctx.prompts`, `ctx.log`, `ctx.status`) — imperative, delegates to `@clack/prompts`. The `feat/log-config` branch adds full clack API coverage here.
2. **Screen mode** (React/Ink) — declarative components for TUI screens. Currently re-exports `@inkjs/ui` components with no customization.

The screen-mode components don't match the clack visual style and lack features clack provides (disabled options, hints, validation, generic values, etc.). This design closes that gap by building a full component library with clack-level API coverage.

## Assessment: @inkjs/ui v2

### What it provides

| Component       | Props                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `Select`        | `options`, `defaultValue`, `onChange`, `isDisabled`, `visibleOptionCount`, `highlightText`             |
| `MultiSelect`   | `options`, `defaultValue`, `onChange`, `onSubmit`, `isDisabled`, `visibleOptionCount`, `highlightText` |
| `ConfirmInput`  | `defaultChoice`, `onConfirm`, `onCancel`, `isDisabled`, `submitOnEnter`                                |
| `TextInput`     | `placeholder`, `defaultValue`, `suggestions`, `onChange`, `onSubmit`, `isDisabled`                     |
| `PasswordInput` | `placeholder`, `onChange`, `onSubmit`, `isDisabled`                                                    |
| `EmailInput`    | `placeholder`, `defaultValue`, `domains`, `onChange`, `onSubmit`, `isDisabled`                         |
| `Spinner`       | `label`, `type`                                                                                        |
| `ProgressBar`   | `value` (0-100)                                                                                        |
| `Alert`         | `children`, `variant`, `title`                                                                         |
| `StatusMessage` | `children`, `variant`                                                                                  |
| `Badge`         | `children`, `color`                                                                                    |
| `OrderedList`   | list rendering                                                                                         |
| `UnorderedList` | list rendering                                                                                         |

### Theming system

`@inkjs/ui` v2 has a `ThemeProvider` + `extendTheme` + `useComponentTheme` system. Each component reads styles from the theme context. Styles are functions that receive state (`isFocused`, `isSelected`, etc.) and return Ink props (`color`, `bold`, `gap`, `paddingLeft`, etc.). Some components also have a `config` function for swapping symbols/characters.

### Limitations

- **`Option` type** is `{ label: string, value: string }` — no `disabled`, no `hint`, value must be `string`
- **No validation** on TextInput or PasswordInput
- **No generic value types** — everything is `string`
- **ConfirmInput** has no custom active/inactive labels, no message header
- **PasswordInput** has no custom mask character
- **Spinner** has no start/stop/message lifecycle (just renders an animated frame + label)
- **ProgressBar** has no `max`, no `style` variants, no label — just `value` (0-100)
- **Components are opinionated black boxes** — no render props, no slot patterns

## Decision: Build Custom for Full API Coverage

Every component in the kidd library is built custom on raw Ink primitives. This ensures full clack-level API coverage — disabled options, hints, validation, generic values, lifecycle controls — with a consistent visual style. No component is "theme only" since even the simpler @inkjs/ui components (Spinner, ProgressBar) lack features clack provides.

`@inkjs/ui` remains available as `@kidd-cli/core/ui/base` for anyone who wants the raw vanilla Ink widgets.

### Gap analysis: @inkjs/ui vs clack

| Component            | @inkjs/ui gaps                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Select**           | No per-option `disabled`, `hint`. No generic `TValue`. No `onSubmit`. Value is `string` only.                    |
| **MultiSelect**      | No per-option `disabled`, `hint`. No `required`. No generic `TValue`. Value is `string` only.                    |
| **ConfirmInput**     | No custom active/inactive labels.                                                                                |
| **TextInput**        | No `validate`.                                                                                                   |
| **PasswordInput**    | No `validate`. No custom mask character.                                                                         |
| **Spinner**          | No start/stop/message lifecycle. Just `label` + `type`. Clack's spinner has `.start()`, `.stop()`, `.message()`. |
| **ProgressBar**      | No `max`, no `style` variants (light/heavy/block), no label. Clack has `advance(step, message)`.                 |
| **Alert**            | Adequate for display, but kidd version should match clack `box()` API (width, alignment, padding, rounded).      |
| **StatusMessage**    | Adequate for display, but kidd version should use clack's symbol set.                                            |
| **GroupMultiSelect** | Missing entirely.                                                                                                |
| **Autocomplete**     | Missing entirely.                                                                                                |
| **SelectKey**        | Missing entirely.                                                                                                |
| **PathPrompt**       | Missing entirely.                                                                                                |

## Structure

The codebase splits into two concerns: the **screen runtime** (framework plumbing that mounts Ink, wires context, manages the output store) and the **component library** (what users compose inside their screens).

```
packages/core/src/
├── screen/
│   ├── screen.tsx                # screen() factory — mounts Ink, creates store, wires context
│   ├── provider.tsx              # KiddContext provider (React context for screen runtime)
│   ├── output/
│   │   ├── store.ts              # OutputStore factory (internal)
│   │   ├── store-key.ts          # Symbol injection for output store (internal)
│   │   ├── screen-log.ts         # Screen-backed Log implementation (internal)
│   │   ├── screen-spinner.ts     # Screen-backed Spinner implementation (internal)
│   │   ├── screen-report.ts      # Screen-backed Report implementation (internal)
│   │   ├── types.ts              # OutputEntry, SpinnerState, etc.
│   │   └── index.ts              # Internal barrel
│   └── index.ts                  # Exports: screen, useScreenContext
├── command/                      # Existing — command() factory, handler types
├── context/                      # Existing — CommandContext, ScreenContext, prompts, status
├── middleware/                    # Existing — auth, http, icons, etc.
├── ui/
│   ├── base/
│   │   └── index.ts              # Raw @inkjs/ui + Ink re-exports (vanilla, no kidd styling)
│   ├── prompts/
│   │   ├── select.tsx            # Single-select with disabled, hints, generic value
│   │   ├── multi-select.tsx      # Multi-select with checkboxes, required, generic value
│   │   ├── group-multi-select.tsx # Grouped multi-select with section headers
│   │   ├── confirm.tsx           # Confirm with custom active/inactive labels
│   │   ├── text-input.tsx        # Text input with validate, placeholder
│   │   ├── password-input.tsx    # Password input with validate, custom mask
│   │   ├── autocomplete.tsx      # Filtered select with text input
│   │   ├── select-key.tsx        # Single-keypress selection
│   │   ├── path-input.tsx        # Filesystem path autocomplete
│   │   ├── types.ts              # PromptOption<TValue>, shared prompt types
│   │   └── index.ts              # Barrel export for all prompt components
│   ├── display/
│   │   ├── spinner.tsx           # Spinner with start/stop/message lifecycle
│   │   ├── progress-bar.tsx      # Progress bar with max, style, label
│   │   ├── alert.tsx             # Alert box with variant, title, alignment
│   │   ├── status-message.tsx    # Status message with variant icons
│   │   └── index.ts              # Barrel export for all display components
│   ├── layout/
│   │   ├── scroll-area.tsx       # Existing (moved)
│   │   ├── tabs.tsx              # Existing (moved)
│   │   ├── fullscreen.tsx        # Existing (moved)
│   │   ├── use-size.tsx          # Existing (moved)
│   │   └── index.ts              # Barrel export for all layout components
│   ├── output.tsx                # <Output /> component (reads from screen's output store)
│   ├── theme.ts                  # Kidd color palette and symbol constants
│   └── index.ts                  # Root barrel — re-exports prompts/, display/, layout/, Output
```

### Separation of concerns

- **`screen/`** — a peer to `command/` at the core level. Owns `screen()` factory, context provider, and the output store internals (screen-backed log, spinner, report). Users never import from `screen/output/` directly. `screen()` and `useScreenContext()` are exported from the core barrel alongside `command()`, `cli()`, etc.
- **`ui/`** — component library. Everything users compose inside their screens. `<Output />` lives here as a component that reads from the store `screen()` creates — it's the user-facing interface to the output system.

`screen()` imports `FullScreen` from `ui/layout/` when `fullscreen: true` is set. It does not import any prompt or display components — those are purely user-land.

### Import examples

```ts
// Core — screen() is a peer to command()
import { command, screen, useScreenContext } from '@kidd-cli/core'

// Component library — single flat import path
import {
  Select,
  MultiSelect,
  Confirm,
  TextInput,
  PasswordInput,
  Spinner,
  ProgressBar,
  Alert,
  StatusMessage,
  Tabs,
  ScrollArea,
  FullScreen,
  Output,
} from '@kidd-cli/core/ui'
```

### Export paths

| Path                | What it exports                                                                    |
| ------------------- | ---------------------------------------------------------------------------------- |
| `@kidd-cli/core`    | `cli()`, `command()`, `screen()`, `useScreenContext()`, middleware, context types  |
| `@kidd-cli/core/ui` | All kidd components — prompts, display, layout, Output, base Ink primitives, types |

The directory structure (`prompts/`, `display/`, `layout/`, `base/`) is an internal organizational detail. Users always import from `@kidd-cli/core/ui` — one path, one barrel.

## Shared Types

```ts
interface PromptOption<TValue> {
  readonly value: TValue
  readonly label: string
  readonly hint?: string
  readonly disabled?: boolean
}
```

This replaces `@inkjs/ui`'s `Option` (`{ label: string, value: string }`) for all kidd components.

## Component APIs

### Select

```tsx
interface SelectProps<TValue> {
  readonly options: readonly PromptOption<TValue>[]
  readonly defaultValue?: TValue
  readonly maxVisible?: number
  readonly onChange?: (value: TValue) => void
  readonly onSubmit?: (value: TValue) => void
  readonly isDisabled?: boolean
}
```

- Arrow keys navigate, disabled options are skipped
- Focused option shows pointer indicator, selected shows filled dot
- Hints render dimmed beside the label
- Disabled options render dimmed with strikethrough
- Scrolls when list exceeds `maxVisible`

### MultiSelect

```tsx
interface MultiSelectProps<TValue> {
  readonly options: readonly PromptOption<TValue>[]
  readonly defaultValue?: readonly TValue[]
  readonly maxVisible?: number
  readonly required?: boolean
  readonly onChange?: (value: readonly TValue[]) => void
  readonly onSubmit?: (value: readonly TValue[]) => void
  readonly isDisabled?: boolean
}
```

- Space toggles selection (filled/empty checkbox)
- Enter submits; if `required` and nothing selected, shows validation message
- Disabled options shown but not toggleable

### Confirm

```tsx
interface ConfirmProps {
  readonly active?: string // default: "Yes"
  readonly inactive?: string // default: "No"
  readonly defaultValue?: boolean
  readonly onSubmit?: (value: boolean) => void
  readonly isDisabled?: boolean
}
```

- Left/right or y/n to toggle
- Enter to submit
- Active choice highlighted, inactive dimmed

### TextInput

```tsx
interface TextInputProps {
  readonly placeholder?: string
  readonly defaultValue?: string
  readonly validate?: (value: string) => string | undefined
  readonly onChange?: (value: string) => void
  readonly onSubmit?: (value: string) => void
  readonly isDisabled?: boolean
}
```

- Full cursor movement (left/right, home/end, backspace/delete)
- Validation runs on submit; error shown below input
- Placeholder shown dimmed when empty

### PasswordInput

```tsx
interface PasswordInputProps {
  readonly placeholder?: string
  readonly mask?: string // default: "*"
  readonly validate?: (value: string) => string | undefined
  readonly onChange?: (value: string) => void
  readonly onSubmit?: (value: string) => void
  readonly isDisabled?: boolean
}
```

- Same as TextInput but input masked with `mask` character

### GroupMultiSelect

```tsx
interface GroupMultiSelectProps<TValue> {
  readonly options: Readonly<Record<string, readonly PromptOption<TValue>[]>>
  readonly defaultValue?: readonly TValue[]
  readonly required?: boolean
  readonly selectableGroups?: boolean
  readonly onChange?: (value: readonly TValue[]) => void
  readonly onSubmit?: (value: readonly TValue[]) => void
  readonly isDisabled?: boolean
}
```

- Group headers rendered as section labels
- If `selectableGroups`, toggling a group header toggles all its options
- Options within each group are indented

### Autocomplete

```tsx
interface AutocompleteProps<TValue> {
  readonly options: readonly PromptOption<TValue>[]
  readonly placeholder?: string
  readonly maxVisible?: number
  readonly defaultValue?: TValue
  readonly filter?: (search: string, option: PromptOption<TValue>) => boolean
  readonly onChange?: (value: TValue) => void
  readonly onSubmit?: (value: TValue) => void
  readonly isDisabled?: boolean
}
```

- Text input filters the option list in real-time
- Default filter: case-insensitive label substring match
- Arrow keys navigate filtered results, enter selects

### SelectKey

```tsx
interface SelectKeyProps<TValue extends string> {
  readonly options: readonly PromptOption<TValue>[]
  readonly onSubmit?: (value: TValue) => void
  readonly isDisabled?: boolean
}
```

- Each option's `value` is a single key character
- Pressing the key immediately selects that option
- Options rendered with key highlighted

### PathInput

```tsx
interface PathInputProps {
  readonly root?: string
  readonly directoryOnly?: boolean
  readonly defaultValue?: string
  readonly validate?: (value: string) => string | undefined
  readonly onChange?: (value: string) => void
  readonly onSubmit?: (value: string) => void
  readonly isDisabled?: boolean
}
```

- Text input with tab-completion from the filesystem
- Suggestions shown below input
- `directoryOnly` filters to directories

### Spinner

```tsx
interface SpinnerProps {
  readonly label?: string
  readonly isActive?: boolean
  readonly type?: SpinnerName // from cli-spinners
}
```

- Renders animated spinner frame + label
- `isActive` controls whether the spinner animates (default `true`)
- Matches clack's visual style (colored frame, label beside it)

### ProgressBar

```tsx
interface ProgressBarProps {
  readonly value: number
  readonly max?: number // default: 100
  readonly label?: string
  readonly style?: 'light' | 'heavy' | 'block'
  readonly size?: number // bar width in characters
}
```

- Renders a progress bar with completed/remaining segments
- `style` controls the bar characters (light shade, heavy shade, or block)
- `label` shown beside the bar
- Automatically fills available width if `size` not specified

### Alert

```tsx
interface AlertProps {
  readonly children: ReactNode
  readonly variant: 'info' | 'success' | 'error' | 'warning'
  readonly title?: string
  readonly width?: number | 'auto'
  readonly rounded?: boolean
  readonly contentAlign?: 'left' | 'center' | 'right'
  readonly titleAlign?: 'left' | 'center' | 'right'
}
```

- Bordered box with variant-colored border and icon
- Matches clack `box()` API for alignment and width control

### StatusMessage

```tsx
interface StatusMessageProps {
  readonly children: ReactNode
  readonly variant: 'info' | 'success' | 'error' | 'warning'
}
```

- Icon + message, variant determines color and symbol
- Uses clack's symbol set (matching `ctx.log.info/success/error/warn`)

## Visual Style

All components use a consistent clack-inspired visual language:

**Select (focused):**

```
  ● Option A        hint text
  ○ Option B
  ○ Option C        hint text
  ○ Option D (disabled)
```

**MultiSelect (focused):**

```
  ◼ TypeScript
  ◻ ESLint
  ◼ Prettier
  ◻ Tailwind (disabled)
```

**Confirm:**

```
  Yes / No
```

**TextInput:**

```
  my-project█
```

**TextInput (validation error):**

```
  █
  Project name is required.
```

**Spinner:**

```
  ◒ Loading...
```

**ProgressBar:**

```
  ████████░░░░░░░░ 50% Installing dependencies
```

**Alert:**

```
  ╭─ Warning ──────────────────╮
  │  ⚠ Config file not found.  │
  ╰────────────────────────────╯
```

### Color palette

| Element                                  | Color                 |
| ---------------------------------------- | --------------------- |
| Focused option pointer/label             | `cyan`                |
| Selected indicator (filled dot/checkbox) | `cyan`                |
| Unselected indicator                     | `dim`                 |
| Disabled option                          | `dim` + strikethrough |
| Hint text                                | `dim`                 |
| Validation error                         | `red`                 |
| Active confirm choice                    | `cyan` + underline    |
| Inactive confirm choice                  | `dim`                 |
| Cursor                                   | inverse               |
| Placeholder                              | `dim`                 |
| Spinner frame                            | `cyan`                |
| Progress completed                       | `cyan`                |
| Progress remaining                       | `dim`                 |
| Alert info border                        | `blue`                |
| Alert success border                     | `green`               |
| Alert error border                       | `red`                 |
| Alert warning border                     | `yellow`              |

## Stories

Every component ships with a `.stories.tsx` file using kidd's built-in stories system (`@kidd-cli/core/stories`). Stories are viewable via `kidd stories` in the terminal with live hot-reload, interactive props editing, and keyboard navigation.

### Story pattern

Each component gets a story group with variants covering key states:

```tsx
// ui/prompts/select.stories.tsx
import { stories } from '@kidd-cli/core/stories'
import { z } from 'zod'

import { Select } from './select.js'

const schema = z.object({
  maxVisible: z.number().describe('Max visible options'),
  isDisabled: z.boolean().describe('Disable interaction'),
})

export default stories({
  title: 'Select',
  component: Select,
  schema,
  defaults: {
    options: [
      { value: 'next', label: 'Next.js', hint: 'React framework' },
      { value: 'remix', label: 'Remix' },
      { value: 'astro', label: 'Astro', hint: 'Content-focused' },
      { value: 'nuxt', label: 'Nuxt', disabled: true },
    ],
    onSubmit: (v: string) => {},
  },
  stories: {
    Default: {
      props: { maxVisible: 5, isDisabled: false },
      description: 'Standard select with hints and disabled option',
    },
    Disabled: {
      props: { maxVisible: 5, isDisabled: true },
      description: 'Fully disabled select',
    },
  },
})
```

### Required stories per component

| Component            | Variants                                                      |
| -------------------- | ------------------------------------------------------------- |
| **Select**           | Default, WithHints, DisabledOptions, Scrolling, Disabled      |
| **MultiSelect**      | Default, WithRequired, DisabledOptions, Preselected, Disabled |
| **Confirm**          | Default, CustomLabels, DefaultNo, Disabled                    |
| **TextInput**        | Default, WithPlaceholder, WithValidation, Disabled            |
| **PasswordInput**    | Default, CustomMask, WithValidation, Disabled                 |
| **GroupMultiSelect** | Default, SelectableGroups, WithRequired                       |
| **Autocomplete**     | Default, CustomFilter, Disabled                               |
| **SelectKey**        | Default, Disabled                                             |
| **PathInput**        | Default, DirectoryOnly, WithValidation                        |
| **Spinner**          | Default, CustomType, Inactive                                 |
| **ProgressBar**      | Empty, Half, Full, WithLabel, StyleVariants                   |
| **Alert**            | Info, Success, Error, Warning, WithTitle                      |
| **StatusMessage**    | Info, Success, Error, Warning                                 |

### Viewing

```bash
kidd stories                          # Launch TUI viewer with hot-reload
kidd stories --check                  # Validate all stories
kidd stories --out Select             # Render Select story to stdout
kidd stories --include 'ui/**'        # Filter to ui stories only
```

## Phases

### Phase 1: Foundation

1. Extract `screen/` — move `screen.tsx`, `provider.tsx`, `output/` into `src/screen/`
2. Create `ui/base/index.ts` — move raw Ink + @inkjs/ui re-exports here
3. Create `ui/theme.ts` — kidd color palette and symbol constants
4. Create `ui/prompts/types.ts` — `PromptOption<TValue>`, shared prompt types
5. Move existing layout components into `ui/layout/` with barrel
6. Move `<Output />` component to `ui/output.tsx` (reads from screen's store)
7. Set up barrel exports for each group and root `ui/index.ts`
8. Update package exports in `package.json` for new paths

### Phase 2: Core Prompts (`ui/prompts/`)

9. `prompts/select.tsx` + `prompts/select.stories.tsx`
10. `prompts/multi-select.tsx` + `prompts/multi-select.stories.tsx`
11. `prompts/confirm.tsx` + `prompts/confirm.stories.tsx`
12. `prompts/text-input.tsx` + `prompts/text-input.stories.tsx`
13. `prompts/password-input.tsx` + `prompts/password-input.stories.tsx`
14. `prompts/index.ts` — barrel export

### Phase 3: Extended Prompts (`ui/prompts/`)

15. `prompts/group-multi-select.tsx` + `prompts/group-multi-select.stories.tsx`
16. `prompts/autocomplete.tsx` + `prompts/autocomplete.stories.tsx`
17. `prompts/select-key.tsx` + `prompts/select-key.stories.tsx`
18. `prompts/path-input.tsx` + `prompts/path-input.stories.tsx`

### Phase 4: Display Components (`ui/display/`)

19. `display/spinner.tsx` + `display/spinner.stories.tsx`
20. `display/progress-bar.tsx` + `display/progress-bar.stories.tsx`
21. `display/alert.tsx` + `display/alert.stories.tsx`
22. `display/status-message.tsx` + `display/status-message.stories.tsx`
23. `display/index.ts` — barrel export

### Phase 5: Integration

24. Update root `ui/index.ts` to re-export all groups
25. Update component standards doc
26. Run `kidd stories --check` to validate all stories pass

## Agent Team Execution Plan

Work is parallelized across agent teams. Phase 1 (foundation) runs first since everything depends on it. After that, phases 2-4 run in parallel — prompts, extended prompts, and display components have no dependencies on each other.

### Phase 1: Foundation (sequential — blocks everything)

**Agent: `foundation`**

- Extract `screen/` directory, move `output/` internals
- Create `ui/base/`, `ui/theme.ts`, `ui/prompts/types.ts`
- Move layout components into `ui/layout/`
- Move `<Output />` to `ui/output.tsx`
- Wire barrel exports, update `package.json`
- Run `pnpm check` to verify nothing broke

### Phase 2-4: Components (parallel teams after Phase 1)

**Agent: `prompts-core`** (Phase 2)

- Build Select + stories
- Build MultiSelect + stories
- Build Confirm + stories
- Build TextInput + stories
- Build PasswordInput + stories
- Wire `prompts/index.ts` barrel

**Agent: `prompts-extended`** (Phase 3)

- Build GroupMultiSelect + stories
- Build Autocomplete + stories
- Build SelectKey + stories
- Build PathInput + stories

**Agent: `display`** (Phase 4)

- Build Spinner + stories
- Build ProgressBar + stories
- Build Alert + stories
- Build StatusMessage + stories
- Wire `display/index.ts` barrel

### Phase 5: Integration (sequential — after all teams complete)

**Agent: `integration`**

- Update root `ui/index.ts` barrel
- Update component standards doc
- Run `pnpm check` + `kidd stories --check`

### Dependency graph

```
foundation
    ├── prompts-core ──────┐
    ├── prompts-extended ──┼── integration
    └── display ───────────┘
```

## Build Approach

All custom components are built on raw Ink primitives:

- **Layout**: `Box` (flexbox), `Text` (styled text)
- **Input**: `useInput` from Ink with `isActive` guard
- **State**: `useState` / `useReducer` (following existing kidd patterns)
- **Conditionals**: `ts-pattern` `match()` — no ternaries, no switch
- **Immutability**: all props `readonly`, all state frozen, no `let`
- **Symbols**: `figures` package for cross-platform indicators
- **Colors**: Ink's `color` / `dimColor` / `bold` props

No dependency on `@inkjs/ui` internals (OptionMap, etc.) — all custom components are self-contained.

## Dependencies

No new dependencies required. Everything used is already in the tree:

- `ink` (Box, Text, useInput)
- `figures` (symbols)
- `ts-pattern` (conditionals)
- `@inkjs/ui` (re-exported via `ui/base` only)
- `react` (hooks)
- `cli-spinners` (spinner animation frames, already a dep of @inkjs/ui)
