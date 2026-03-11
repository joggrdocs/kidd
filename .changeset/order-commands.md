---
'@kidd-cli/core': minor
'@kidd-cli/cli': minor
---

Restructure commands as a grouped config object

Replace the flat `commandOrder` option on `cli()` and `order` field on `command()` with a unified `CommandsConfig` object nested inside the `commands` field. The new structure groups command source (`path` or inline `commands` map) alongside display ordering under a single key. Backward compatibility is preserved — `commands` still accepts a plain string path or a `CommandMap`.
