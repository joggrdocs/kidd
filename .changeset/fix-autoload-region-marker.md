---
'@kidd-cli/bundler': patch
---

Fix autoload plugin region marker mismatch (`autoloader.ts` → `autoload.ts`) that prevented the static autoloader from replacing the runtime filesystem scanner during `kidd build`
