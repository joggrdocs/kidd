# kidd-cli

## 0.3.1

### Patch Changes

- 06dfbf1: Read template versions from pnpm-workspace.yaml at runtime instead of hardcoded constants
- 5f46e63: Update all dependencies to latest versions
- Updated dependencies [a86bacc]
- Updated dependencies [5f46e63]
  - @kidd-cli/bundler@0.2.1
  - @kidd-cli/config@0.1.5
  - @kidd-cli/core@0.5.1

## 0.3.0

### Minor Changes

- 6d8889a: Add `ConfigType` utility type and `CliConfig` augmentation interface for typed `ctx.config`.

  **@kidd-cli/core:**

  - Add `ConfigType<TSchema>` utility type to derive `CliConfig` from a Zod schema
  - Rename `KiddConfig` augmentation interface to `CliConfig` to avoid confusion with the build config type in `@kidd-cli/config`
  - Export `CliConfig` and `ConfigType` from `@kidd-cli/core`

  **@kidd-cli/cli:**

  - Add `--config` flag to `kidd init` to scaffold config schema setup during project creation
  - Add `kidd add config` command to scaffold config into existing projects
  - Scaffolded config includes Zod schema with `ConfigType` module augmentation wiring

### Patch Changes

- 0db5742: Convert `loadCLIManifest` from throwing errors to returning Result tuples and add warning logs when version resolution falls back to `0.0.0` in the init command
- Updated dependencies [a7dff7d]
- Updated dependencies [0db5742]
- Updated dependencies [6d8889a]
- Updated dependencies [70deba8]
  - @kidd-cli/core@0.5.0

## 0.2.0

### Minor Changes

- 61e22eb: Restructure commands as a grouped config object

  Replace the flat `commandOrder` option on `cli()` and `order` field on `command()` with a unified `CommandsConfig` object nested inside the `commands` field. The new structure groups command source (`path` or inline `commands` map) alongside display ordering under a single key. Backward compatibility is preserved — `commands` still accepts a plain string path or a `CommandMap`.

### Patch Changes

- 9f1b155: Auto-detect CLI version from package.json at build time

  The kidd bundler now reads the `version` field from the project's `package.json` during build and injects it as a compile-time constant (`__KIDD_VERSION__`). At runtime, `cli()` no longer requires an explicit `version` option — it falls back to the injected constant automatically. Explicit `version` still takes precedence when provided. The build command output now displays the detected version.

- 97b92b7: upgrade dependencies across all packages
- Updated dependencies [9f1b155]
- Updated dependencies [2f7137b]
- Updated dependencies [61e22eb]
- Updated dependencies [fc486c6]
- Updated dependencies [97b92b7]
- Updated dependencies [ac61665]
  - @kidd-cli/bundler@0.2.0
  - @kidd-cli/core@0.4.0
  - @kidd-cli/utils@0.1.4
  - @kidd-cli/config@0.1.4

## 0.1.4

### Patch Changes

- 7042b46: Fix coding standards violations across packages

  Replace `as` type assertions with type annotations, type guards, and documented exceptions. Replace `try/catch` blocks with `attempt`/`attemptAsync` from es-toolkit. Replace multi-branch `if/else` chains with `ts-pattern` `match` expressions. Rename `redactPaths` constant to `REDACT_PATHS`. Document intentional mutation and `throw` exceptions with inline comments.

- 4387e02: Sync init template dependency versions from pnpm-workspace.yaml catalog

  Replace hardcoded zod, typescript, vitest, and tsdown versions in the init template with liquid variables sourced from a generated constants file. Add a laufen script (`sync-template-versions`) to regenerate the constants from the pnpm catalog, and a test to catch version drift.

- 6a538bc: upgrade dependencies across all packages
- Updated dependencies [7042b46]
- Updated dependencies [19b8277]
- Updated dependencies [6a538bc]
  - @kidd-cli/core@0.3.0
  - @kidd-cli/utils@0.1.3
  - @kidd-cli/config@0.1.3
  - @kidd-cli/bundler@0.1.3

## 0.1.3

### Patch Changes

- f48ad38: Refactor CLI commands to use shared config helpers and validation utilities
- Updated dependencies [f48ad38]
- Updated dependencies [fd5bfcd]
- Updated dependencies [f48ad38]
- Updated dependencies [f48ad38]
  - @kidd-cli/core@0.2.0
  - @kidd-cli/utils@0.1.2
  - @kidd-cli/bundler@0.1.2
  - @kidd-cli/config@0.1.2

## 0.1.2

### Patch Changes

- 5c78d6a: Fix command export default typing by adding explicit `Command` return type to the `command()` factory and removing unsafe `as unknown as Command` casts from all command modules
- Updated dependencies [5c78d6a]
  - @kidd-cli/core@0.1.2

## 0.1.1

### Patch Changes

- 02a4303: Rename `kidd` to `@kidd-cli/core` and `kidd-cli` to `@kidd-cli/cli` to comply with npm's package naming policy. All imports, docs, and references updated.
- 442dce2: scaffold `kidd.config.ts` instead of `tsdown.config.ts` in init templates
- d8064fa: Add repository metadata and configure npm trusted publishing with OIDC
- Updated dependencies [02a4303]
- Updated dependencies [d8064fa]
  - @kidd-cli/core@0.1.1
  - @kidd-cli/bundler@0.1.1
  - @kidd-cli/config@0.1.1
  - @kidd-cli/utils@0.1.1

## 0.1.0

### Minor Changes

- be8b790: Initial release

### Patch Changes

- Updated dependencies [be8b790]
  - kidd@0.1.0
  - @kidd-cli/utils@0.1.0
  - @kidd-cli/config@0.1.0
  - @kidd-cli/bundler@0.1.0
