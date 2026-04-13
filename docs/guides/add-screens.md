# Add Screens

Create interactive terminal UIs with React/Ink components using `screen()` commands.

## Prerequisites

- An existing kidd CLI project
- `@kidd-cli/core` installed (`pnpm add @kidd-cli/core`)
- `react` installed (`pnpm add react`)
- TSX support enabled in your build tooling (`.tsx` file extension)

## Steps

### 1. Create a screen command

Use `screen()` from `@kidd-cli/core/ui` instead of `command()`. The `render` property accepts a React component that receives parsed args as props:

```tsx
import { Box, screen, Text } from '@kidd-cli/core/ui'
import React from 'react'
import { z } from 'zod'

function Greeting({ name }: { readonly name: string }): React.ReactElement {
  return (
    <Box padding={1}>
      <Text color="green" bold>
        Hello, {name}!
      </Text>
    </Box>
  )
}

export default screen({
  description: 'Greet with a styled UI',
  options: z.object({
    name: z.string().describe('Name to greet'),
  }),
  render: Greeting,
})
```

Save this file with a `.tsx` extension (e.g. `src/commands/greet.tsx`).

### 2. Choose an exit behavior

Screen commands support two exit modes controlled by the `exit` property:

**Manual exit (default)** -- the screen stays alive until the component calls `useApp().exit()` or the user presses Ctrl-C:

```tsx
import { Box, screen, Text, useApp, useInput } from '@kidd-cli/core/ui'
import React from 'react'

function Dashboard(): React.ReactElement {
  const { exit } = useApp()

  useInput((input) => {
    if (input === 'q') exit()
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Dashboard</Text>
      <Text>Press q to quit</Text>
    </Box>
  )
}

export default screen({
  description: 'Interactive dashboard',
  render: Dashboard,
})
```

**Auto exit** -- the runtime calls exit automatically once the component unmounts or the render tree settles. Use for status displays that render once and complete:

```tsx
import { Box, screen, Text } from '@kidd-cli/core/ui'
import React from 'react'

function Status(): React.ReactElement {
  return (
    <Box padding={1}>
      <Text color="green">All systems operational</Text>
    </Box>
  )
}

export default screen({
  description: 'Show system status',
  exit: 'auto',
  render: Status,
})
```

### 3. Access context with useScreenContext

Inside screen components, use `useScreenContext()` to access runtime context instead of the `ctx` parameter. The hook returns a `ScreenContext` containing `args`, `meta`, `store`, `log`, `status`, and any middleware-decorated properties:

```tsx
import { Box, Text, useScreenContext } from '@kidd-cli/core/ui'
import React from 'react'

function Info(): React.ReactElement {
  const ctx = useScreenContext()

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{ctx.meta.name} v{ctx.meta.version}</Text>
      <Text>Command: {ctx.meta.command.join(' ')}</Text>
    </Box>
  )
}
```

`ctx.log` and `ctx.status.spinner` are available in screen components but are automatically swapped with React-backed implementations that render through the `<Output />` component.

Properties not available in screens: `colors`, `fail`, `format`, `prompts`. Use React components and Ink primitives for all output instead.

### 4. Use Ink hooks for interactivity

Import Ink hooks directly from `@kidd-cli/core/ui`:

**useInput** -- handle keyboard input:

```tsx
import { Box, Text, useApp, useInput } from '@kidd-cli/core/ui'
import React, { useState } from 'react'

function Counter(): React.ReactElement {
  const { exit } = useApp()
  const [count, setCount] = useState(0)

  useInput((input, key) => {
    if (input === 'q') exit()
    if (key.upArrow) setCount((c) => c + 1)
    if (key.downArrow) setCount((c) => c - 1)
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Counter: {count}</Text>
      <Text dimColor>Up/Down to change, q to quit</Text>
    </Box>
  )
}
```

**useFocus** -- manage focus between components:

```tsx
import { Box, Text, useFocus } from '@kidd-cli/core/ui'
import React from 'react'

function FocusableItem({ label }: { readonly label: string }): React.ReactElement {
  const { isFocused } = useFocus()

  return (
    <Box>
      <Text color={isFocused ? 'green' : undefined}>
        {isFocused ? '> ' : '  '}{label}
      </Text>
    </Box>
  )
}
```

### 5. Use built-in UI components

`@kidd-cli/core/ui` re-exports Ink primitives and additional display and prompt components:

```tsx
import { Box, Select, Spinner, Text, useApp } from '@kidd-cli/core/ui'
import React, { useState } from 'react'

function DeployPipeline({ target }: { readonly target: string }): React.ReactElement {
  const { exit } = useApp()
  const [phase, setPhase] = useState<'select' | 'deploying' | 'done'>('select')

  if (phase === 'deploying') {
    return (
      <Box padding={1}>
        <Spinner label={`Deploying to ${target}...`} />
      </Box>
    )
  }

  if (phase === 'done') {
    return (
      <Box padding={1}>
        <Text color="green">Deployed to {target}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Confirm deployment</Text>
      <Select
        options={[
          { label: 'Deploy', value: 'deploy' },
          { label: 'Cancel', value: 'cancel' },
        ]}
        onChange={(value) => {
          if (value === 'cancel') {
            exit()
            return
          }
          setPhase('deploying')
          setTimeout(() => {
            setPhase('done')
            setTimeout(() => exit(), 1000)
          }, 2000)
        }}
      />
    </Box>
  )
}
```

### 6. Render in fullscreen mode

Use the `fullscreen` option to render in the terminal's alternate screen buffer. This preserves the user's scrollback history and restores it on exit:

```tsx
export default screen({
  description: 'Full-screen dashboard',
  fullscreen: true,
  render: Dashboard,
})
```

The `fullscreen` option also accepts a resolver function for conditional fullscreen:

```tsx
export default screen({
  description: 'Dashboard',
  fullscreen: (ctx) => ctx.args.fullscreen === true,
  options: z.object({
    fullscreen: z.boolean().default(false).describe('Run in fullscreen mode'),
  }),
  render: Dashboard,
})
```

### 7. Organize screen components

Follow these file conventions:

- Use `.tsx` extension for files containing screen commands or React components
- Use `.ts` extension for handler-only commands
- Place command-private components in a `_components/` subdirectory (the leading underscore prevents autoloader from treating them as commands)
- Name React components with PascalCase

```
src/commands/
  dashboard.tsx          # screen command
  dashboard/
    _components/
      sidebar.tsx        # private component
      status-bar.tsx     # private component
  deploy.ts              # handler command
```

## Verification

Run the screen command:

```bash
npx my-app greet --name World
```

Expected output: a styled terminal UI rendering the greeting component. The process exits based on the configured exit behavior.

For interactive screens:

```bash
npx my-app dashboard
```

Expected: an interactive TUI that responds to keyboard input and exits when the user presses the quit key or Ctrl-C.

## Troubleshooting

### useScreenContext throws "must be used inside a screen() component"

**Issue:** Calling `useScreenContext()` outside a screen command throws an error.

**Fix:** `useScreenContext()` can only be called inside components rendered by `screen()`. It requires the KiddProvider that the screen runtime injects. If you need context in a non-screen command, use the `ctx` parameter in the handler instead.

### Middleware does not run for screen commands

**Issue:** Middleware like `auth()` or `report()` does not execute for screen commands.

**Fix:** Screen commands skip the middleware pipeline. The runtime invokes the render function directly. If a screen needs authenticated data, fetch it inside the component using `useScreenContext()` to access any context properties that were decorated before the screen rendered.

### Component renders but immediately exits

**Issue:** The screen flashes and then the process exits.

**Fix:** The default exit mode is `'manual'`, which keeps the screen alive until `useApp().exit()` is called. If the screen exits immediately, check for `exit: 'auto'` in the screen definition. With auto exit, the runtime unmounts the component after the first render settles. Remove `exit: 'auto'` or switch to manual exit for persistent UIs.

### Terminal output is garbled after screen exits

**Issue:** After a fullscreen screen exits, the terminal shows artifacts or incorrect content.

**Fix:** Ensure the screen definition uses `fullscreen: true` so the alternate screen buffer is used. The runtime writes the leave-alternate-screen escape sequence on exit. If the process crashes before cleanup, run `reset` in the terminal to restore the default state.

### Ink components not found

**Issue:** Import errors when using `Box`, `Text`, `Select`, or other components.

**Fix:** Import all Ink primitives from `@kidd-cli/core/ui`, never directly from `ink` or `@inkjs/ui`. The kidd package re-exports everything needed:

```tsx
import { Box, Select, Spinner, Text, useApp, useInput } from '@kidd-cli/core/ui'
```

## Resources

- [Ink](https://github.com/vadimdemedes/ink)
- [React](https://react.dev)

## References

- [Screens Concepts](/docs/concepts/screens)
- [Build a CLI](./build-a-cli.md)
- [Context](/docs/concepts/context)
- [Core Reference](/reference/packages/kidd)
