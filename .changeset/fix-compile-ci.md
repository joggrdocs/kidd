---
'@kidd-cli/bundler': minor
'@kidd-cli/cli': minor
---

Fix `--compile` failures on CI by moving c12 optional dep externals to the tsdown build step

- Moved `chokidar`, `magicast`, and `giget` externalization from `bun build --compile` to the tsdown `neverBundle` config. These c12 optional deps were causing failures in strict pnpm layouts (e.g. GitHub Actions) where Bun couldn't resolve them even when marked as `--external`.
- Added `--verbose` flag to `kidd build` that surfaces bun's stderr output on compile failures.
- Captured stderr from `execFile` in `execBunBuild` so compile errors include actionable diagnostics.
