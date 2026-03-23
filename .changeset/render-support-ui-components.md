---
'@kidd-cli/core': minor
'@kidd-cli/bundler': patch
---

Add `screen()` factory for building React/Ink TUI commands. Screens receive parsed args as component props; runtime context is available via `useConfig()`, `useMeta()`, and `useStore()` hooks through a `KiddProvider`. Export all Ink primitives and `@inkjs/ui` components from `@kidd-cli/core/ui`. Add `.tsx`/`.jsx` support to the bundler command scanner.
