# Components

## Overview

Standards for React/Ink components used in kidd CLI commands. Commands can use a `render` function instead of a `handler` to own the full terminal UI lifecycle with React components. These rules govern file conventions, component structure, colocation, and when to choose render mode over handler mode.

## Rules

### Use `.tsx` for Files with JSX

Command files that contain JSX must use the `.tsx` extension. Files without JSX use `.ts`. The autoloader discovers both extensions.

#### Correct

```
commands/
├── deploy.ts            # handler-only command
├── status.tsx           # render command with JSX
└── dashboard/
    ├── index.tsx         # parent render command
    └── _components/
        └── StatusTable.tsx
```

#### Incorrect

```
commands/
├── status.ts            # contains JSX but uses .ts extension
```

### Name Components with PascalCase

All React function components use PascalCase names. This applies to both shared and command-private components.

#### Correct

```tsx
function StatusRow(props: StatusRowProps): React.ReactElement {
  return (
    <Box>
      <Text>{props.name}</Text>
    </Box>
  )
}
```

#### Incorrect

```tsx
function statusRow(props: StatusRowProps): React.ReactElement {
  return (
    <Box>
      <Text>{props.name}</Text>
    </Box>
  )
}
```

### Colocate Props Interfaces

Define props interfaces in the same file as the component. Use `readonly` on all properties. Name them `{ComponentName}Props`.

#### Correct

```tsx
interface StatusRowProps {
  readonly name: string
  readonly status: 'pass' | 'fail'
  readonly duration?: number
}

function StatusRow(props: StatusRowProps): React.ReactElement {
  return (
    <Box>
      <Text>{props.name}</Text>
    </Box>
  )
}
```

#### Incorrect

```tsx
// Props defined in a separate types.ts file for a single component
import type { StatusRowProps } from './types.js'
```

### Use `_components/` for Command-Private Components

Components used by a single command live in a `_components/` directory next to the command file. The leading underscore prevents the autoloader from treating them as commands.

#### Correct

```
commands/
├── status.tsx
└── status/
    └── _components/
        ├── StatusTable.tsx
        └── StatusRow.tsx
```

### Use `src/ui/` for Shared Components

Components used by multiple commands live in `src/ui/`. Import them with the `@/` alias.

#### Correct

```
src/
├── ui/
│   ├── Table.tsx
│   └── Spinner.tsx
└── commands/
    ├── status.tsx       # imports from @/ui/Table.tsx
    └── deploy.tsx       # imports from @/ui/Table.tsx
```

### Choose `render` for Interactive or Stateful UI

Use `render` when the command needs React state, hooks, dynamic updates, or complex layout. Use `handler` for sequential operations that log output and exit.

| Use `render` when                              | Use `handler` when              |
| ---------------------------------------------- | ------------------------------- |
| UI updates over time (spinners, progress)      | Sequential log-and-exit flow    |
| Interactive selection or input within the view | Simple prompts via `ctx.log`    |
| Complex layout with multiple columns/sections  | Streaming text output           |
| React hooks manage async state                 | One-shot data fetch and display |

#### Correct -- render mode

```tsx
import { render } from 'ink'
import { command } from '@kidd-cli/core'

import { Dashboard } from './_components/Dashboard.js'

export default command({
  description: 'Show live dashboard',
  render(props) {
    const { waitUntilExit } = render(<Dashboard {...props} />)
    return waitUntilExit()
  },
})
```

#### Correct -- handler mode

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Deploy the application',
  handler(ctx) {
    const s = ctx.log.spinner('Deploying...')
    // ... deploy logic
    s.stop('Deployed')
  },
})
```

### The `render` Function Owns the Lifecycle

The `render` function receives `RenderProps` (not the full `Context`) and is responsible for importing Ink, calling `render()`, and awaiting `waitUntilExit()`. The runtime does not import React or Ink on behalf of the command.

```tsx
import type { RenderProps } from '@kidd-cli/core'

export default command({
  description: 'Interactive status view',
  render(props: RenderProps) {
    // Command owns the Ink import and render call
    const { render } = await import('ink')
    const { waitUntilExit } = render(<StatusView {...props} />)
    return waitUntilExit()
  },
})
```

`RenderProps` provides `args`, `config`, `meta`, `store`, and `colors`. It does not include `ctx.log`, `ctx.fail`, or middleware variables -- render commands manage their own output through React components.

### No `let` at Module Level

The `no let` rule still applies at module level in `.tsx` files. Inside React components, `useState` and other hooks manage mutable state -- this is the expected pattern for component-local state.

#### Correct

```tsx
const REFRESH_INTERVAL = 5000

function Dashboard(props: DashboardProps): React.ReactElement {
  const [status, setStatus] = useState<Status>('idle')
  // ...
}
```

#### Incorrect

```tsx
let refreshInterval = 5000 // module-level let is banned

function Dashboard(props: DashboardProps): React.ReactElement {
  // ...
}
```

### Use Ink Primitives for Layout

Use `Box` and `Text` from Ink for all layout. Do not write raw strings or use `console.log` inside components.

#### Correct

```tsx
import { Box, Text } from 'ink'

function StatusRow(props: StatusRowProps): React.ReactElement {
  return (
    <Box gap={1}>
      <Text color="green">{props.name}</Text>
      <Text dimColor>{props.detail}</Text>
    </Box>
  )
}
```

#### Incorrect

```tsx
function StatusRow(props: StatusRowProps): React.ReactElement {
  console.log(`${props.name}: ${props.detail}`)
  return <></>
}
```

## Resources

- [Ink](https://github.com/vadimdemedes/ink)
- [React](https://react.dev)

## References

- [Coding Style](./coding-style.md) -- Constraints (no classes, no let, no throw, etc.)
- [Design Patterns](./design-patterns.md) -- Factories, pipelines, composition
- [Naming](./naming.md) -- Naming conventions
