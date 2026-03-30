---
'@kidd-cli/bundler': minor
'@kidd-cli/config': minor
'@kidd-cli/cli': minor
---

Targeted build clean: only remove kidd build artifacts instead of nuking the entire dist directory. Foreign files are preserved and a warning is printed when detected. Clean can be disabled via `build.clean: false` in config or `--no-clean` CLI flag.
