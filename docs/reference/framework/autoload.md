# autoload()

Scan a directory for command files and produce a `CommandMap`. Recursively discovers commands from files and subdirectories, deriving command names from filenames.

Import from `@kidd-cli/core`.

```ts
import { autoload } from '@kidd-cli/core'

const commands = await autoload({ dir: './commands' })
```

## AutoloadOptions

| Field | Type     | Default        | Description                            |
| ----- | -------- | -------------- | -------------------------------------- |
| `dir` | `string` | `'./commands'` | Directory to scan for command files     |

The `dir` path is resolved to an absolute path before scanning.

## File naming conventions

| Pattern            | Behavior                        |
| ------------------ | ------------------------------- |
| `deploy.ts`        | Registers command named `deploy` |
| `_helpers.ts`      | Ignored (underscore prefix)     |
| `.hidden.ts`       | Ignored (dot prefix)            |
| `index.ts`         | Parent handler for directory    |
| `build.d.ts`       | Ignored (declaration file)      |
| `readme.md`        | Ignored (non-JS/TS extension)   |

Valid extensions: `.ts`, `.js`, `.mjs`, `.tsx`, `.jsx`

## Command name derivation

Command names come from the filename with its extension stripped. A command's `name` property takes precedence over the filename-derived name when both exist.

```
commands/
  deploy.ts     → "deploy"
  run-tests.ts  → "run-tests"
```

## Directory mapping

Subdirectories become parent commands with their files as subcommands.

```
commands/
  generate/
    index.ts       → parent handler for "generate"
    command.ts     → subcommand "generate command"
    middleware.ts  → subcommand "generate middleware"
  tools/
    lint.ts        → subcommand "tools lint"
```

| Directory structure              | Result                                              |
| -------------------------------- | --------------------------------------------------- |
| Directory with `index.ts`        | Index becomes the parent handler, other files become subcommands |
| Directory without `index.ts`     | Handler-less group command that demands a subcommand |
| Empty directory                  | Skipped entirely                                    |
| Directory with `_` or `.` prefix | Ignored                                             |

## Duplicate handling

When multiple commands resolve to the same name (e.g. via explicit `name` overrides), the first definition wins. A warning is emitted for each collision.

## Import requirements

Each command file must have a default export that is a tagged `Command` object (created via `command()`). Files that do not match this shape are silently skipped. Import errors are logged when `KIDD_DEBUG=true`.

## Usage with cli()

The `commands` option on `cli()` accepts a directory path string, which internally calls `autoload()`:

```ts
import { cli } from '@kidd-cli/core'

cli({
  name: 'my-app',
  version: '1.0.0',
  commands: './src/commands',
})
```

## References

- [command()](./command)
- [cli()](./bootstrap)
- [Lifecycle](/docs/concepts/lifecycle)
