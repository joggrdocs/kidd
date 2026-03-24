---
'@kidd-cli/bundler': minor
'@kidd-cli/cli': minor
'@kidd-cli/core': minor
---

Fix `--compile` failures on CI and example type errors

- Moved `chokidar`, `magicast`, and `giget` externalization from `bun build --compile` to the tsdown `neverBundle` config. These c12 optional deps were causing failures in strict pnpm layouts (e.g. GitHub Actions) where Bun couldn't resolve them even when marked as `--external`.
- Added `--verbose` flag to `kidd build` that surfaces bun's stderr output on compile failures.
- Captured stderr from `execFile` in `execBunBuild` so compile errors include actionable diagnostics.
- Added module augmentation to `report` middleware so `ctx.report` is typed on all commands when middleware is registered at the `cli()` level (matching the existing `icons` middleware pattern).
- Fixed `icons` example to use `ctx.log.raw()` and `ctx.format.table()` instead of removed `ctx.output` API.
