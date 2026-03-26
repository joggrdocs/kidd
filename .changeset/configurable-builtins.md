---
'@kidd-cli/core': minor
---

Add configurable built-in options and improve aliases

- Add `builtins` field to `CliOptions` for toggling `--version` and `--working-directory`
- Rename `--cwd` to `--working-directory` with `--cwd` as alias
- Add `-h` alias for `--help`, `-V` alias for `--version`
- `--help` / `-h` is always registered and cannot be disabled
