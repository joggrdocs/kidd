---
'@kidd-cli/core': patch
'@kidd-cli/cli': patch
---

Fix command export default typing by adding explicit `Command` return type to the `command()` factory and removing unsafe `as unknown as Command` casts from all command modules
