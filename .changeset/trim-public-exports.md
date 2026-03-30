---
'@kidd-cli/core': minor
'@kidd-cli/utils': minor
'@kidd-cli/bundler': minor
---

Remove dead and internal-only exports from public API surface. Drops 4 unused sub-entrypoints from `@kidd-cli/core` (`./config`, `./format`, `./store`, `./project`), the unused `./redact` sub-entrypoint from `@kidd-cli/utils`, and 8 internal-only functions plus 9 unused types from `@kidd-cli/bundler`.
