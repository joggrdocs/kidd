---
'@kidd-cli/bundler': minor
'@kidd-cli/cli': patch
---

Replace tsdown with Bun.build as the bundler backend, running builds via a subprocess runner for improved performance and binary compilation support.
