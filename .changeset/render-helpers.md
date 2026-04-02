---
"@kidd-cli/core": minor
---

feat(core): export `render()` and `renderToString()` helpers that wrap Ink's render methods with kidd's `KiddProvider` (screen context, output store, screen-backed log/spinner/report). Enables full lifecycle control from normal `command()` handlers.

Fixes #147
