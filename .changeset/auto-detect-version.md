---
'@kidd-cli/bundler': minor
'@kidd-cli/core': minor
'@kidd-cli/cli': patch
---

Auto-detect CLI version from package.json at build time

The kidd bundler now reads the `version` field from the project's `package.json` during build and injects it as a compile-time constant (`__KIDD_VERSION__`). At runtime, `cli()` no longer requires an explicit `version` option — it falls back to the injected constant automatically. Explicit `version` still takes precedence when provided. The build command output now displays the detected version.
