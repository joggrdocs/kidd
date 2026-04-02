---
'@kidd-cli/bundler': minor
---

Revert Bun.build migration and restore tsdown as the bundler.

- Restore `map-config.ts` with tsdown InlineConfig mapping (build + watch)
- Restore simpler autoload plugin (no `coreDistDir` needed)
- Restore tsdown native watch mode
- Remove `@kidd-cli/core` dependency (no longer needed)
- Remove `bun-runner.ts` subprocess architecture
- Restore `NODE_BUILTINS` and `neverBundle` for proper externalization
