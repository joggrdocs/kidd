# Code Review Feedback

> Deep code review notes collected during manual review.

<!-- Status legend: `todo` | `in progress` | `done` -->

---

## packages/config

### loader.ts

- `todo` — `toErrorMessage` should be replaced with `toError().message` — unnecessary abstraction when the composed form is just as readable

### schema.ts

- `todo` — Replace raw Result tuple literals (`[null, result.data]`, `[error, null]`) with `ok()` / `err()` helpers throughout — applies broadly across the codebase

## packages/cli

### manifest.ts

- `todo` — Inconsistent naming: `loadCLIManifest` vs `readManifest` — pick one verb (`load` or `read`) and use it consistently

### Commands (general)

- `todo` — All commands should use the `name` field — audit and add where missing
- `todo` — Commands use unnecessary intermediate variable with type annotation (e.g. `const doctorCommand: Command = command({})`) — should just `export default command({})` directly; the factory return type is sufficient

## packages/utils

### tag.ts

- `todo` — `TagBrand` is a weird name — find a more descriptive/intuitive name

### redact.ts

- `todo` — `SENSITIVE_PATTERNS` should use named constants for each pattern (e.g. `API_KEY_PATTERN`, `JWT_PATTERN`) instead of an anonymous array of regexes — improves readability and makes each pattern's intent clear

### validate.ts

- `todo` — `formatZodIssues` shouldn't be a standalone export — instead, bake formatted messages into the `validate` Result error path so callers get useful error info automatically without a separate call

## packages/bundler

### Organization

- `todo` — All source files are flat in `src/` — needs a rethink on module organization and grouping

## packages/core

### Organization

- `todo` — `utils/constants` feels unnecessary — rethink what belongs there and whether it should exist at all
- `todo` — Broader concern: core package organization needs a review pass — evaluate module boundaries and where things live

### command.ts

- `todo` — Using custom type checks instead of `es-toolkit` (via `utils/fp`) — should replace with `es-toolkit` equivalents (e.g. `isString`, `isNil`, etc.); applies broadly across core
- `todo` — `withDefault` is a custom reimplementation — either move to `@kidd-cli/utils` as a shared `defaults()` helper or replace with `es-toolkit` equivalent

### Naming (broad)

- `todo` — Function naming audit needed across core — many functions have unclear or inconsistent names (seen in `autoloader.ts` and elsewhere); do a pass to align with naming conventions

### runtime.ts

- `todo` — Prefer `satisfies` over explicit return type annotations (e.g. `: Runtime`) — `satisfies` validates the shape while preserving the narrower inferred type; applies broadly across core

### `@module` banners

- `done` — Assessed: only 20 files (9.4%) have them, all in `middleware/` — pattern is disciplined and intentional. Banners add value for complex domain modules (RFC refs, architectural reasoning). No action needed — keep as-is.

### middleware/auth/oauth-server.ts

- `todo` — Replace `in` operator checks with `Object.hasOwn()` or a `has()` utility — `in` walks the prototype chain and is less explicit

### runtime/args/

- `todo` — Missing test coverage for `runtime/args` — needs end-to-end tests covering the Zod-to-yargs argument pipeline

## Cross-cutting

### tsconfig.json (all packages)

- `todo` — TypeScript error in `packages/config`: common source directory is `./src` but `rootDir` is not explicitly set — needs `"rootDir": "./src"` added (likely affects all packages)
- `todo` — `packages/core` is the only package with path aliases (`@/*`, `@test/*`, `@kidd-cli/core`) — consider standardizing across packages or documenting why only core has them
- `todo` — `packages/core` includes `test` in `include` but then excludes `**/*.test.ts` — contradictory; should align with other packages or remove the exclusion
- `todo` — No root `tsconfig.json` — IDEs expect one for monorepo project detection; consider adding with `references` to all packages
- `todo` — `@kidd-cli/core` self-referential path alias in core — works but unconventional; document if intentional

### tsdown.config.ts (all packages)

- `todo` — `packages/cli` missing `fixedExtension: false` — all other packages set it explicitly
- `todo` — `packages/core` defines `alias: { '@': './src' }` in tsdown config — redundant with `paths` in tsconfig.json; other packages don't do this
- `todo` — `packages/cli` uses glob entry pattern (`src/commands/**/*.ts`) while all others use explicit object notation — intentional but worth documenting
- `todo` — Consider a shared tsdown base config (like `tsconfig.base.json`) to enforce consistency across packages

### package.json (all packages)

**Critical:**
- `todo` — `packages/bundler`: `tsdown` is in `dependencies` instead of `devDependencies` — gets installed for consumers unnecessarily

**Metadata (all packages):**
- `todo` — Missing `homepage` field — should point to GitHub repo (`https://github.com/joggrdocs/kidd/tree/main/packages/{name}`)
- `todo` — Missing `bugs` field — should point to `https://github.com/joggrdocs/kidd/issues`
- `todo` — Missing `sideEffects: false` — needed for tree-shaking (except `packages/cli`)
- `todo` — Only `packages/cli` and `packages/core` have `keywords` — add to all packages

**packages/cli specific:**
- `todo` — No `exports` map — only has `bin`; should define exports if any utilities are reexported
- `todo` — Build script copies `pnpm-workspace.yaml` into dist — verify this is actually needed at runtime

**Other notes:**
- `c12` pinned to `4.0.0-beta.4` in both `packages/config` and `packages/core` — track for stable release
- `packages/core` has proper `peerDependencies` + `peerDependenciesMeta` for `jiti` and `pino` (optional) — good pattern

### Zod types

- `todo` — Stop duplicating types alongside Zod schemas — use `z.infer<>` as the default
- `todo` — Only define a separate interface/type when JSDoc is needed on the type itself
- `todo` — When a separate type exists alongside a schema, add a Vitest type test (`expectTypeOf`) to verify the manual type and `z.infer<>` stay in sync

### Publishing

- `todo` — Add README.md for all published packages — needed for npm package pages
