---
'@kidd-cli/core': minor
---

Add `ctx.dotdir` — a `DotDirectoryClient` that provides scoped filesystem operations for CLI dot directories (e.g. `~/.myapp/`, `<project>/.myapp/`). Supports `read`, `write`, `readJson`, `writeJson`, `exists`, `remove`, `ensure`, and `path` operations with a protection registry that middleware can use to guard sensitive files. Auth middleware now protects `auth.json` by default.

Rename `Context` to `CommandContext` and `useCommandContext` to `useScreenContext` for clearer delineation between command handlers and screen components. Module augmentation declarations updated accordingly — consumers should update `interface Context` to `interface CommandContext` in their `declare module '@kidd-cli/core'` blocks.
