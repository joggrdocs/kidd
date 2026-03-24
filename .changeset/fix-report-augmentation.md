---
'@kidd-cli/core': minor
---

Add module augmentation to report middleware

- Added `declare module` augmentation so `ctx.report` is typed on all commands when `report()` middleware is registered at the `cli()` level, matching the existing `icons` middleware pattern.
- Fixed `icons` example to use `ctx.log.raw()` and `ctx.format.table()` instead of removed `ctx.output` API.
