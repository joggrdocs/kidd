---
'@kidd-cli/core': minor
'@kidd-cli/cli': minor
---

feat(core): add configurable `strict` mode for CLI, command, and screen

Add `strict` option to `CliOptions`, `CommandDef`, and `ScreenDef` to control whether yargs rejects unknown flags. Defaults to `true` (existing behavior). Per-command `strict: false` overrides the CLI-level setting.

feat(cli): add `kidd run` command

New command to run the current kidd CLI project with three engine modes:

- `node` (default) — builds first, then runs `node dist/index.mjs`
- `tsx` — runs the source entry file directly via `tsx`
- `binary` — builds and compiles, then executes the compiled binary

Supports `--inspect`, `--inspect-brk`, `--inspect-wait`, and `--inspect-port` for debugging (node and tsx engines only). All unknown flags are forwarded to the executed CLI.
