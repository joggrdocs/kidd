# Add Icons to Your CLI

Register Nerd Font icons with automatic emoji fallback using the icons middleware.

## Prerequisites

- An existing kidd CLI project
- `@kidd-cli/core` installed (`pnpm add @kidd-cli/core`)
- A Nerd Font installed (optional -- the middleware falls back to emoji when Nerd Fonts are not detected)

## Steps

### 1. Register the icons middleware

Import `icons` from `@kidd-cli/core/icons` and add it to the `middleware` array in `cli()`:

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

Importing `@kidd-cli/core/icons` automatically augments `CommandContext` with `readonly icons: IconsContext`. No manual type augmentation is needed.

### 2. Use icons in a command

Access `ctx.icons.get()` in any command handler to resolve an icon name to its glyph:

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Show repository status',
  handler: async (ctx) => {
    const branch = ctx.icons.get('branch')
    const commit = ctx.icons.get('commit')

    ctx.log.info(`${branch} On branch: main`)
    ctx.log.info(`${commit} Last commit: abc1234`)
  },
})
```

When Nerd Fonts are installed, the output uses Nerd Font glyphs. When Nerd Fonts are not detected, the output uses emoji fallback characters.

### 3. Use icon categories

Retrieve all icons for a category using `ctx.icons.category()`:

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Show status legend',
  handler: async (ctx) => {
    const status = ctx.icons.category('status')

    ctx.log.info(`${status.success} pass`)
    ctx.log.info(`${status.error} fail`)
    ctx.log.info(`${status.warning} warning`)
    ctx.log.info(`${status.pending} pending`)
  },
})
```

Available categories: `git`, `devops`, `status`, `files`.

### 4. Add custom icons

Pass custom icon definitions to the `icons()` middleware. Each definition requires a `nerdFont` glyph and an `emoji` fallback:

```ts
import { icons } from '@kidd-cli/core/icons'

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

### 5. Enable auto-setup

When `autoSetup` is enabled, the middleware prompts users to install Nerd Fonts if none are detected:

```ts
icons({
  autoSetup: true,
})
```

To install a specific font family without prompting:

```ts
icons({
  autoSetup: true,
  font: 'FiraCode',
})
```

When auto-setup fails, a warning is logged and the middleware falls back to emoji. Commands continue to work without interruption.

### 6. Check font availability in commands

Use `ctx.icons.installed()` to check whether Nerd Fonts are available, and `ctx.icons.setup()` to trigger interactive installation:

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Check CLI environment',
  handler: async (ctx) => {
    if (!ctx.icons.installed()) {
      ctx.log.warn('Nerd Fonts not detected. Icons will use emoji fallback.')

      const [error] = await ctx.icons.setup()
      if (error) {
        ctx.log.warn(`Font install failed: ${error.message}`)
      }
    }
  },
})
```

## Verification

Run a command that uses icons and verify the output renders correctly:

```bash
npx my-app status
```

**With Nerd Fonts installed** -- you see Nerd Font glyphs (e.g. branch icon, commit icon).

**Without Nerd Fonts installed** -- you see emoji fallback characters (e.g. twisted arrows, memo).

To test both modes, use `forceSetup: true` to force the middleware to treat Nerd Fonts as not installed:

```ts
icons({
  forceSetup: true,
})
```

## Troubleshooting

### Icons show emoji instead of glyphs

**Issue:** The output shows emoji characters even though Nerd Fonts are installed.

**Fix:** The middleware scans platform-specific font directories for files containing "Nerd" in the path. Verify the font file is in one of the scanned directories:

| Platform | Directories scanned |
| --- | --- |
| macOS | `~/Library/Fonts`, `/Library/Fonts`, `/System/Library/Fonts` |
| Linux | `/usr/share/fonts`, `/usr/local/share/fonts`, `~/.fonts`, `~/.local/share/fonts` |
| Windows | `%WINDIR%\Fonts`, `%LOCALAPPDATA%\Microsoft\Windows\Fonts` |

Restart your terminal after installing fonts. Some terminal emulators cache font lists.

### Unknown icon name returns empty string

**Issue:** `ctx.icons.get('my-icon')` returns an empty string.

**Fix:** Check the name against the built-in icon reference in the [Icons concept doc](/docs/concepts/icons#built-in-icon-reference). If using a custom icon, confirm it was passed in the `icons` option and the name matches exactly. Use `ctx.icons.has(name)` to verify:

```ts
if (ctx.icons.has('my-icon')) {
  ctx.log.info(ctx.icons.get('my-icon'))
}
```

### Auto-setup fails to install fonts

**Issue:** The auto-setup prompt runs but font installation fails.

**Fix:** Common causes:

- **Insufficient permissions** -- the install may need elevated privileges for system font directories. Install the font manually or run with appropriate permissions.
- **Network issues** -- font downloads require internet access. Check connectivity.
- **Unsupported platform** -- font directory scanning returns no results on platforms other than macOS, Linux, and Windows.

### Font detection is slow

**Issue:** CLI startup is noticeably slower with the icons middleware.

**Fix:** Font detection scans filesystem directories once during middleware initialization. On systems with large font directories, this can take a moment. The result is cached for the entire command lifecycle. If detection is consistently slow, consider setting `autoSetup: false` and documenting manual font installation for your users.

## Resources

- [Nerd Fonts](https://www.nerdfonts.com)

## References

- [Icons Concepts](/docs/concepts/icons)
- [Build a CLI](./build-a-cli.md)
- [Context](/docs/concepts/context)
- [Core Reference](/reference/packages/kidd)
