---
'@kidd-cli/core': minor
'@kidd-cli/config': minor
'@kidd-cli/bundler': minor
'@kidd-cli/cli': minor
---

Add command ordering for help output

Add `commandOrder` config option and `order` command definition field to control display order of commands in help output and the `commands` tree. Commands listed in the order array appear first in the specified order; omitted commands fall back to alphabetical sort. Invalid names are validated at both build time and runtime.
