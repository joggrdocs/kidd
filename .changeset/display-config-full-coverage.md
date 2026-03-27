---
'@kidd-cli/core': minor
---

feat(core): add DisplayConfig and full clack API coverage

Introduces `DisplayConfig` — a per-CLI configuration object that injects defaults into all clack-backed APIs (`ctx.log`, `ctx.prompts`, `ctx.status`). Only `aliases` and `messages` are applied globally via `updateSettings()`; everything else is merged per-call so method-level options always win.

Also widens all kidd interfaces to match the full `@clack/prompts` API surface:

- **Prompts**: `ConfirmOptions.vertical`, `PasswordOptions.clearOnError`, `GroupMultiSelectOptions.cursorAt`/`groupSpacing`, `AutocompleteOptions.initialUserInput`, `SelectKeyOptions.caseSensitive`, `PathOptions.validate` accepts `string | undefined`
- **Spinner**: `cancel()`, `error()`, `clear()`, `isCancelled`
- **ProgressBar**: `message()`, `cancel()`, `error()`, `clear()`, `isCancelled`
- **TaskLog**: `group()` sub-groups, `TaskLogMessageOptions.raw`, `TaskLogCompletionOptions.showLog`, `TaskLogOptions.spacing`
- **Log**: all level methods accept `LogMessageOptions` (symbol, spacing, secondarySymbol); `note` accepts `NoteOptions` with `format`; `BoxOptions.formatBorder`
