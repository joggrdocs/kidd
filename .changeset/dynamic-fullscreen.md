---
"@kidd-cli/core": minor
---

feat(core): allow `screen({ fullscreen })` to accept a resolver function `(ctx: ScreenContext) => boolean | Promise<boolean>` for runtime fullscreen decisions based on args, config, or terminal capabilities.

Fixes #148
