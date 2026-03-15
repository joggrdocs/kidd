# Icons

The icons system provides Nerd Font glyph resolution with automatic emoji fallback, font detection, interactive installation prompts, and categorized icon definitions for kidd CLIs.

Icons is a sub-export of the `@kidd-cli/core` package (`@kidd-cli/core/icons`), not a separate package. It ships as middleware that decorates `ctx.icons` with methods for resolving icon names to glyphs, checking font availability, and triggering installation.

## Key Concepts

### Nerd Font vs Emoji Fallback

Every icon has two representations: a Nerd Font glyph and an emoji fallback. When the middleware initializes, it detects whether Nerd Fonts are installed on the system. All subsequent `ctx.icons.get()` calls resolve to the appropriate variant automatically.

- **Nerd Fonts detected** -- returns the Nerd Font glyph (e.g. `\uE725` for `branch`)
- **Nerd Fonts not detected** -- returns the emoji fallback (e.g. the twisted arrows emoji for `branch`)

This means commands never need to check font availability themselves. Call `ctx.icons.get('branch')` and the correct character is returned.

### Icon Categories

Icons are organized into four categories:

| Category | Description                | Examples                                     |
| -------- | -------------------------- | -------------------------------------------- |
| `git`    | Version control operations | `branch`, `commit`, `merge`, `pr`, `tag`     |
| `devops` | Infrastructure and CI/CD   | `deploy`, `docker`, `kubernetes`, `terminal` |
| `status` | Status indicators          | `success`, `error`, `warning`, `pending`     |
| `files`  | File types and filesystem  | `file`, `folder`, `typescript`, `json`       |

### Auto-Setup

When `autoSetup` is enabled, the middleware checks for Nerd Font availability during initialization. If no Nerd Font is detected, it prompts the user to install one interactively. This runs once at startup, before any command handler executes.

## Adding the Middleware

```ts
import { cli } from '@kidd-cli/core'
import { icons } from '@kidd-cli/core/icons'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [icons()],
  commands: `${import.meta.dirname}/commands`,
})
```

### With Configuration

```ts
icons({
  autoSetup: true,
  font: 'FiraCode',
})
```

## IconsOptions

| Option       | Type                             | Default           | Description                                                |
| ------------ | -------------------------------- | ----------------- | ---------------------------------------------------------- |
| `icons`      | `Record<string, IconDefinition>` | Built-in defaults | Custom icon definitions to merge with defaults             |
| `autoSetup`  | `boolean`                        | `false`           | Prompt to install Nerd Fonts if not detected               |
| `font`       | `string`                         | `'JetBrainsMono'` | The Nerd Font family to install                            |
| `forceSetup` | `boolean`                        | `false`           | Always show the install prompt, even if fonts are detected |

## IconsContext

The icons middleware decorates `ctx.icons` with an `IconsContext`. The context is both callable and has methods — `ctx.icons('branch')` is equivalent to `ctx.icons.get('branch')`.

| Method / Call     | Type                                            | Description                                                   |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `ctx.icons(name)` | `(name: string) => string`                      | Resolve an icon name to its glyph string (callable shorthand) |
| `get(name)`       | `(name: string) => string`                      | Resolve an icon name to its glyph string                      |
| `has(name)`       | `(name: string) => boolean`                     | Check whether an icon name is defined                         |
| `installed()`     | `() => boolean`                                 | Whether Nerd Fonts are detected on the system                 |
| `setup()`         | `() => AsyncResult<boolean, IconsError>`        | Interactively prompt to install Nerd Fonts                    |
| `category(cat)`   | `(cat: IconCategory) => Record<string, string>` | Get all resolved icons for a given category                   |

### `ctx.icons(name)` / `ctx.icons.get()`

Resolve an icon name to its display string. Returns the Nerd Font glyph when fonts are installed, the emoji fallback otherwise. Returns an empty string when the name is not found. Both `ctx.icons('branch')` and `ctx.icons.get('branch')` return the same result.

```ts
export default command({
  async handler(ctx) {
    // Both forms are equivalent
    const icon = ctx.icons('branch')
    const same = ctx.icons.get('branch')
    ctx.logger.info(`${icon} Current branch: main`)
  },
})
```

### `ctx.icons.has()`

Check whether an icon name exists in the definitions (built-in or custom).

```ts
if (ctx.icons.has('deploy')) {
  ctx.logger.info(`${ctx.icons.get('deploy')} Deploying...`)
}
```

### `ctx.icons.category()`

Retrieve all resolved icons for a category as a record of name-to-glyph mappings.

```ts
const statusIcons = ctx.icons.category('status')
// { success: '...', error: '...', warning: '...', ... }

ctx.logger.info(`${statusIcons.success} Build passed`)
ctx.logger.error(`${statusIcons.error} Tests failed`)
```

### `ctx.icons.installed()`

Check whether Nerd Fonts are available. When `forceSetup` is enabled, this always returns `false` to allow re-triggering the setup flow.

```ts
if (!ctx.icons.installed()) {
  ctx.logger.warn('Nerd Fonts not detected. Icons will use emoji fallback.')
}
```

### `ctx.icons.setup()`

Interactively prompt the user to install Nerd Fonts. Returns a Result tuple with `true` on success or an `IconsError` on failure. On success, subsequent `get()` calls resolve to Nerd Font glyphs.

```ts
if (!ctx.icons.installed()) {
  const [error, result] = await ctx.icons.setup()
  if (error) {
    ctx.logger.warn(`Font install failed: ${error.message}`)
  }
}
```

### IconsError

| `type`               | Description                      |
| -------------------- | -------------------------------- |
| `'detection_failed'` | Nerd Font detection check failed |
| `'install_failed'`   | Font installation failed         |

## Custom Icons

Merge custom icon definitions with the built-in defaults by passing an `icons` record. Each entry must provide both a `nerdFont` glyph and an `emoji` fallback.

```ts
icons({
  icons: {
    lambda: { nerdFont: '\uE7A4', emoji: '\u{03BB}' },
    rust: { nerdFont: '\uE7A8', emoji: '\u{1F980}' },
  },
})
```

Custom definitions override built-in icons with the same name. Access them the same way:

```ts
const icon = ctx.icons.get('lambda')
```

### IconDefinition

```ts
interface IconDefinition {
  readonly nerdFont: string
  readonly emoji: string
}
```

## Built-in Icons

### Git

`branch`, `clone`, `commit`, `compare`, `fetch`, `fork`, `git`, `merge`, `pr`, `tag`, `worktree`

### DevOps

`ci`, `cloud`, `deploy`, `docker`, `kubernetes`, `server`, `terminal`

### Status

`error`, `info`, `pending`, `running`, `stopped`, `success`, `warning`

### Files

`config`, `file`, `folder`, `javascript`, `json`, `lock`, `markdown`, `typescript`

## References

- [kidd API Reference](../reference/kidd.md)
- [Context](./context.md)
- [Lifecycle](./lifecycle.md)
