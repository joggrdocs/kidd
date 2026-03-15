---
'@kidd-cli/cli': patch
---

Convert `loadCLIManifest` from throwing errors to returning Result tuples and add warning logs when version resolution falls back to `0.0.0` in the init command
