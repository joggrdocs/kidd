---
'@kidd-cli/core': minor
---

Add hidden, deprecated, and group support for commands and flags

- Add `Resolvable<T>` utility type (`T | (() => T)`) for values resolved at registration time
- Add `hidden` field on `CommandDef` and `YargsArgDef` to omit commands/flags from help output
- Add `deprecated` field on `CommandDef` and `YargsArgDef` to show deprecation notices
- Add `group` field on `YargsArgDef` to organize flags under headings in help output
- Make `description` on `CommandDef` accept `Resolvable<string>` for dynamic resolution
- All `Resolvable` fields are resolved once at registration time with zero runtime overhead
