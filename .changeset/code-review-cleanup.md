---
'@kidd-cli/utils': patch
'@kidd-cli/core': patch
'@kidd-cli/cli': patch
'@kidd-cli/bundler': patch
---

Code review cleanup: fix missing return after `ctx.fail()` in CLI commands, remove dead code and duplicate helpers, replace raw try/catch with `attemptAsync`/`jsonParse` utilities, fix regex lastIndex mutation in sanitize, fix `onTargetComplete` firing on compile errors, convert sync I/O to async in compile cleanup, replace mutation inside `.filter()` with `.reduce()`, remove `toErrorMessage` in favor of `toError().message`, and rename `fp/predicates` to `fp/transform`.
