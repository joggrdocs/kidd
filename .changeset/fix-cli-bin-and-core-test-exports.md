---
'@kidd-cli/cli': patch
'@kidd-cli/core': patch
---

Fix `packages/cli` bin field pointing to `.mjs` instead of `.js` (tsdown with `fixedExtension: false` and `"type":"module"` outputs `.js`). Add `setArgv` and `runTestCli` to the public `@kidd-cli/core/test` entry point.
