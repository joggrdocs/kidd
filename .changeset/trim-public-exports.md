---
'@kidd-cli/core': minor
'@kidd-cli/utils': minor
'@kidd-cli/bundler': minor
---

Remove dead and internal-only exports from public API surface. Drops 3 unused sub-entrypoints from `@kidd-cli/core` (`./format`, `./store`, `./project`), deletes the dead `@kidd-cli/utils/redact` module (source + tests), removes the `jsonc-parser` dead dependency from core, and trims `@kidd-cli/bundler` to only externally consumed exports.
