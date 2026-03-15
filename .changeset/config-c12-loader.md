---
'@kidd-cli/core': minor
---

Refactor config client to use c12 as primary loader with jiti support

- Add `name.config.*` file pattern support (`.ts`, `.js`, `.json`, `.jsonc`, `.yaml`) via c12
- Keep dotfile patterns (`.name.json`, `.name.jsonc`, `.name.yaml`) as backward-compatible fallback
- Change `write()` default path from `.name.jsonc` to `name.config.jsonc`
- Expand `ConfigFormat` to include `'ts' | 'js'` for TS/JS config files
- Add `ConfigWriteFormat` type for write-only formats (`'json' | 'jsonc' | 'yaml'`)
