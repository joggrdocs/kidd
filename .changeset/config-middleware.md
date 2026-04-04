---
'@kidd-cli/core': minor
---

Extract config loading from core runtime into an opt-in middleware (`@kidd-cli/core/config`) with support for layered resolution (global > project > local). Config is no longer baked into `CommandContext` — it is added via module augmentation when the middleware is imported, keeping builds lean for CLIs that don't need config.

**Breaking:** `ctx.config` is no longer available by default. Use the config middleware:

```ts
import { config } from '@kidd-cli/core/config'

cli({
  middleware: [config({ schema: mySchema, layers: true })],
})
```
