---
'@kidd-cli/core': minor
'@kidd-cli/cli': patch
---

Unify help config: rename `CliHelpOptions` to `HelpOptions`, move `order` from `CommandsConfig` to `HelpOptions`. `HelpOptions` is now used at both `cli()` and `command()` levels with `header`, `footer`, and `order` fields.
