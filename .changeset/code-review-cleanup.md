---
'@kidd-cli/utils': patch
'@kidd-cli/core': patch
'@kidd-cli/cli': patch
'@kidd-cli/bundler': patch
'@kidd-cli/config': patch
---

Comprehensive code review cleanup and refactoring across all packages:

- Reorganize bundler into `build/`, `compile/`, `autoloader/`, `config/` subdirectories
- Split core `types.ts` into `types/utility`, `types/middleware`, `types/command`, `types/cli`
- Create shared `tsdown.base.mjs` config for all packages
- Replace Result tuple literals with `ok()`/`err()` helpers
- Replace custom type checks with `es-toolkit` equivalents
- Fix missing `return` after `ctx.fail()` in CLI commands
- Fix `onTargetComplete` firing on compile errors, convert sync I/O to async
- Fix regex `lastIndex` mutation in sanitize via `replaceAll`
- Remove dead code: duplicate `formatDurationInline`, unreachable guards, passthrough wrappers
- Remove `toErrorMessage` in favor of `toError().message`, rename `fp/predicates` to `fp/transform`
- Replace mutation inside `.filter()` with `.reduce()` in autoload and commands
- Fix `command.name` override being ignored during registration (map key always took precedence)
- Add README for all published packages
- Add 80+ tests for runtime/args (zod, parser, register)
