---
"@kidd-cli/core": minor
---

feat(core): expose `ctx.raw.argv` — a normalized argv where `argv[0]` is always the CLI name (via yargs `$0`), regardless of invocation mode. Middleware can inspect the full invocation without guessing preamble offsets.

Fixes #146
