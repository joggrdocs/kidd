---
'@kidd-cli/core': patch
---

Replace `font-list` native module with platform-native shell commands for Nerd Font detection, fixing bundling failures caused by `font-list`'s internal `require("./libs/core")` not being preserved by tsdown/rolldown
