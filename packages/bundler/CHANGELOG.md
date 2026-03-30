# @kidd-cli/bundler

## 0.3.2

### Patch Changes

- Updated dependencies [687e8a1]
  - @kidd-cli/utils@0.2.0
  - @kidd-cli/config@0.1.7

## 0.3.1

### Patch Changes

- 82740fc: Check that `bun` exists in PATH before compiling; return a descriptive error when it is missing

## 0.3.0

### Minor Changes

- ed3eb91: Fix `--compile` failures on CI

  - Moved `chokidar`, `magicast`, and `giget` externalization from `bun build --compile` to the tsdown `neverBundle` config. These c12 optional deps were causing failures in strict pnpm layouts (e.g. GitHub Actions) where Bun couldn't resolve them even when marked as `--external`.
  - Added `--verbose` flag to `kidd build` that surfaces bun's stderr output on compile failures.
  - Captured stderr from `execFile` in `execBunBuild` so compile errors include actionable diagnostics.

## 0.2.6

### Patch Changes

- 9e4abdc: Add `screen()` factory for building React/Ink TUI commands. Screens receive parsed args as component props; runtime context is available via `useConfig()`, `useMeta()`, and `useStore()` hooks through a `KiddProvider`. Export all Ink primitives and `@inkjs/ui` components from `@kidd-cli/core/ui`. Add `.tsx`/`.jsx` support to the bundler command scanner.

## 0.2.5

### Patch Changes

- 567e7f4: Fix autoload plugin region marker mismatch (`autoloader.ts` → `autoload.ts`) that prevented the static autoloader from replacing the runtime filesystem scanner during `kidd build`

## 0.2.4

### Patch Changes

- c8dd951: Move tsdown from devDependencies to dependencies to fix runtime module resolution

## 0.2.3

### Patch Changes

- 2667bab: fix(packages/core,packages/bundler): exclude .d.ts files from command autoloader

  The `isCommandFile` and `findIndexEntry` functions used `extname()` to check
  file extensions, but `extname('build.d.ts')` returns `'.ts'`, causing `.d.ts`
  declaration files to pass the filter. When `@kidd-cli/cli` is installed under
  `node_modules` and its `dist/commands/` directory contains `.d.ts` files, the
  runtime autoloader attempts to `import()` them, triggering a Node 24 type
  stripping error for files under `node_modules`.

## 0.2.2

### Patch Changes

- 0d0c61f: Comprehensive code review cleanup and refactoring across all packages:

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

- Updated dependencies [0d0c61f]
  - @kidd-cli/utils@0.1.5
  - @kidd-cli/config@0.1.6

## 0.2.1

### Patch Changes

- a86bacc: Update tsdown from 0.21.1 to 0.21.2
- Updated dependencies [5f46e63]
  - @kidd-cli/config@0.1.5

## 0.2.0

### Minor Changes

- 9f1b155: Auto-detect CLI version from package.json at build time

  The kidd bundler now reads the `version` field from the project's `package.json` during build and injects it as a compile-time constant (`__KIDD_VERSION__`). At runtime, `cli()` no longer requires an explicit `version` option — it falls back to the injected constant automatically. Explicit `version` still takes precedence when provided. The build command output now displays the detected version.

### Patch Changes

- fc486c6: Silence tsdown build output so only clack/prompts UI is shown to the user
- 97b92b7: upgrade dependencies across all packages
- Updated dependencies [97b92b7]
  - @kidd-cli/utils@0.1.4
  - @kidd-cli/config@0.1.4

## 0.1.3

### Patch Changes

- 6a538bc: upgrade dependencies across all packages
- Updated dependencies [6a538bc]
  - @kidd-cli/utils@0.1.3
  - @kidd-cli/config@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [f48ad38]
  - @kidd-cli/utils@0.1.2
  - @kidd-cli/config@0.1.2

## 0.1.1

### Patch Changes

- 02a4303: Rename `kidd` to `@kidd-cli/core` and `kidd-cli` to `@kidd-cli/cli` to comply with npm's package naming policy. All imports, docs, and references updated.
- d8064fa: Add repository metadata and configure npm trusted publishing with OIDC
- Updated dependencies [02a4303]
- Updated dependencies [d8064fa]
  - @kidd-cli/config@0.1.1
  - @kidd-cli/utils@0.1.1

## 0.1.0

### Minor Changes

- be8b790: Initial release

### Patch Changes

- Updated dependencies [be8b790]
  - @kidd-cli/utils@0.1.0
  - @kidd-cli/config@0.1.0
