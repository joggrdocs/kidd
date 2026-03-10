---
'@kidd-cli/core': minor
---

Add customizable help banner and clean exit on no-command

Add `CliHelpOptions` type with a `banner` field that displays custom text at the top of help output. When the CLI is invoked without a command, help is now shown to stdout (exit 0) instead of erroring via `demandCommand`.
