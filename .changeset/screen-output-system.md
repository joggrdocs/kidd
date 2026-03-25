---
'@kidd-cli/core': minor
---

### React-Backed Screen Context I/O

Screen commands created with `screen()` now provide React-backed implementations of `ctx.log`, `ctx.spinner`, and `ctx.report` that render declaratively through the new `<Output />` component.

#### What Changed

Previously, `screen()` stripped imperative I/O properties (`log`, `spinner`, `report`) from the context because they wrote directly to stdout and would conflict with Ink's rendering. Now, `screen()` **swaps** them with React-backed implementations that push entries to an `OutputStore`, which `<Output />` subscribes to via `useSyncExternalStore`.

This means the same `ctx.log.info()`, `ctx.spinner.start()`, and `ctx.report.check()` API works identically in both `command()` and `screen()` contexts — no separate rendering logic needed.

#### New Exports from `@kidd-cli/core/ui`

| Export | Description |
|---|---|
| `<Output />` | Component that renders accumulated log, spinner, and report entries from an `OutputStore` |
| `useOutputStore()` | Hook to access the `OutputStore` from the current screen context |
| `OutputStore` | Type for the external store interface |
| `OutputProps` | Props type for the `Output` component |

#### Usage

```tsx
import { Output, screen, useApp, useOutputStore, useScreenContext } from '@kidd-cli/core/ui'
import { useEffect, useRef } from 'react'

function MyScreen(): ReactElement {
  const ctx = useScreenContext()
  const store = useOutputStore()
  const { exit } = useApp()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const run = async (): Promise<void> => {
      ctx.spinner.start('Working...')
      await doWork()
      ctx.spinner.stop('Done')

      ctx.log.success('All tasks complete')
      exit()
    }

    void run()
  }, [ctx, exit])

  return <Output store={store} />
}

export default screen({
  description: 'Example screen with output',
  render: MyScreen,
})
```

#### Middleware Support

If middleware decorates the context with additional I/O (e.g. `report` from the report middleware), `screen()` automatically detects and swaps those with screen-backed versions too.

#### Context Changes

`ScreenContext` now retains `log` and `spinner` (React-backed). Only `colors`, `fail`, `format`, and `prompts` are stripped from the screen context, as they have no React equivalent.
