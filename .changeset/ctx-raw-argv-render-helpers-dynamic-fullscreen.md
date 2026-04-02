---
"@kidd-cli/core": minor
---

feat(core): expose `ctx.raw.argv`, `render`/`renderToString` helpers, and dynamic `fullscreen` resolution

- Add `ctx.raw.argv` — a normalized argv where `argv[0]` is always the CLI name (via yargs `$0`), regardless of invocation mode. Middleware can inspect the full invocation without guessing preamble offsets.
- Export `render()` and `renderToString()` helpers that wrap Ink's render methods with kidd's `KiddProvider` (screen context, output store, screen-backed log/spinner/report). Enables full lifecycle control from normal `command()` handlers.
- Allow `screen({ fullscreen })` to accept a resolver function `(ctx: ScreenContext) => boolean | Promise<boolean>` for runtime fullscreen decisions based on args, config, or terminal capabilities.

Fixes #146, #147, #148
