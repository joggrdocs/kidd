---
'@kidd-cli/cli': patch
'@kidd-cli/core': patch
'@kidd-cli/config': patch
'@kidd-cli/utils': patch
'@kidd-cli/bundler': patch
---

fix(cli): bundle @kidd-cli/* deps so published CLI is self-contained

The published CLI had bare imports to workspace packages whose npm exports maps
were stale (renamed subpaths like `./loader` → `./utils`, `./fs` → `./node`).
Commands silently disappeared because the autoloader swallowed import errors.

- Bundle all `@kidd-cli/*` packages into CLI dist via `deps.alwaysBundle`
- Add `KIDD_DEBUG` env var support to surface autoload import failures
- Add integration test asserting all commands appear in `--help` output
- Republish all packages to sync npm exports maps with source
