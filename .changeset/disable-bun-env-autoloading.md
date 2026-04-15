---
'@kidd-cli/config': minor
'@kidd-cli/bundler': minor
---

Disable Bun's automatic `.env` and `bunfig.toml` loading in compiled binaries by default. Adds `autoloadDotenv` option to compile config for opt-in `.env` loading. `bunfig.toml` loading is always disabled.
