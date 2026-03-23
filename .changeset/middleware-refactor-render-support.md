---
'@kidd-cli/core': minor
'@kidd-cli/cli': patch
---

Move logger, spinner, and prompts off base Context into a `logger()` middleware (`ctx.log`). Extract diagnostics into a `report()` middleware (`ctx.report`).
