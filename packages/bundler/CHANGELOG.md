# @kidd-cli/bundler

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
