# figures()

Middleware that decorates `ctx.figures` with platform-appropriate Unicode symbols. Falls back to simpler glyphs on terminals with poor Unicode support.

Import from `@kidd-cli/core/figures`.

```ts
import { figures } from '@kidd-cli/core/figures'

cli({
  middleware: [figures()],
})
```

## FiguresOptions

| Field     | Type                          | Default          | Description                                      |
| --------- | ----------------------------- | ---------------- | ------------------------------------------------ |
| `figures` | `Record<string, string>`      | `figures` package | Custom figures record (useful for testing)       |

When no options are provided, the middleware uses the [figures](https://github.com/sindresorhus/figures) package which automatically detects terminal Unicode support.

## Available symbols

The default figures record includes all symbols from the `figures` package. Common symbols:

| Symbol          | Unicode | Fallback | Description               |
| --------------- | ------- | -------- | ------------------------- |
| `tick`          | `✔`     | `√`      | Success indicator         |
| `cross`         | `✖`     | `×`      | Failure indicator         |
| `arrowRight`    | `→`     | `→`      | Right arrow               |
| `arrowLeft`     | `←`     | `←`      | Left arrow                |
| `arrowUp`       | `↑`     | `↑`      | Up arrow                  |
| `arrowDown`     | `↓`     | `↓`      | Down arrow                |
| `warning`       | `⚠`     | `‼`      | Warning indicator         |
| `info`          | `ℹ`     | `i`      | Info indicator            |
| `bullet`        | `●`     | `*`      | Bullet point              |
| `pointer`       | `❯`     | `>`      | Pointer / prompt          |
| `line`          | `─`     | `─`      | Horizontal line           |
| `ellipsis`      | `…`     | `...`    | Ellipsis                  |

## Accessing figures

After the middleware runs, symbols are available on `ctx.figures`:

```ts
export default command({
  middleware: [figures()],
  handler(ctx) {
    ctx.log.info(`${ctx.figures.tick} Deploy complete`)
    ctx.log.error(`${ctx.figures.cross} Build failed`)
  },
})
```

## Fallback behavior

The underlying `figures` package detects whether the terminal supports Unicode. On terminals with limited support (e.g. Windows `cmd.exe`), it substitutes simpler ASCII-safe glyphs automatically. No configuration is needed.

## Custom figures

Pass a custom record to override the default symbols:

```ts
figures({
  figures: {
    tick: '[OK]',
    cross: '[FAIL]',
    warning: '[WARN]',
  },
})
```

## Module augmentation

Importing `@kidd-cli/core/figures` automatically augments `CommandContext` with the `figures` property, so `ctx.figures` is typed without manual casting.

## Types

Exported from `@kidd-cli/core/figures`:

| Type              | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `FiguresContext`  | `Record<string, string>` of symbol names to glyphs    |
| `FiguresEnv`      | Middleware environment declaring `ctx.figures`         |
| `FiguresOptions`  | Options for the `figures()` factory                   |
| `FiguresFactory`  | Factory function type signature                       |

## References

- [middleware()](../framework/middleware)
- [cli()](../framework/bootstrap)
- [Icons](/docs/concepts/icons)
