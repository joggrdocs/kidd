---
'@kidd-cli/core': minor
---

Refactor config client to use c12 for all config file resolution

- Support `name.config.*` patterns (TS, JS, JSON, JSONC, YAML, TOML) via c12
- Support `name.*` short-form patterns for data formats only (JSON, JSONC, YAML, TOML)
- Long form (`name.config.*`) takes priority over short form (`name.*`)
- Change `write()` default path from `.name.jsonc` to `name.config.jsonc`
- Expand `ConfigFormat` to include `'ts' | 'js'` for TS/JS config files
- Add `ConfigWriteFormat` type for write-only formats (`'json' | 'jsonc' | 'yaml'`)
