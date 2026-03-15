---
'@kidd-cli/core': patch
---

Refactor autoloader to extract shared filtering/mapping logic into `buildCommandMapFromEntries` helper, eliminating duplication between `autoload()` and `buildSubCommands()`
