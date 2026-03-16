---
'@kidd-cli/core': major
'@kidd-cli/cli': patch
---

Replace `args` with separate `options` and `positionals` fields on command definitions.

**Breaking:** The `args` field on `command()` has been removed. Use `options` for flags and `positionals` for positional arguments. Both accept a Zod object schema or a yargs-native record. The `PositionalDef` type has been removed. `ctx.args` remains unchanged at runtime — options and positionals are merged under the hood.
