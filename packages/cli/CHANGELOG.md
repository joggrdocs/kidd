# kidd-cli

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
