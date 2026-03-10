---
'@kidd-cli/core': minor
'@kidd-cli/cli': minor
---

Add command ordering for help output

Add `commandOrder` option to `cli()` and `order` field to `command()` for controlling display order of commands in help output and the `commands` tree. Commands listed in the order array appear first in the specified order; omitted commands fall back to alphabetical sort. Invalid names are validated at runtime.
