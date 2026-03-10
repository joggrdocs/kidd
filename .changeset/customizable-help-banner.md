---
'@kidd-cli/core': minor
---

Add customizable help header/footer and clean exit on no-command

Add `CliHelpOptions` type with `header` and `footer` fields. `header` displays custom text (e.g., ASCII logo) above help output only when the CLI is invoked without a command. `footer` displays text below help output on all help (maps to yargs `.epilogue()`). When the CLI is invoked without a command, help is now shown to stdout (exit 0) instead of erroring via `demandCommand`.
