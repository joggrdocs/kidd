# kidd

## 0.13.0

### Minor Changes

- 10799c2: Clear the alternate screen buffer before leaving fullscreen mode to prevent lingering content
- a53ee68: Add fullscreen mode for screens via alternate screen buffer. New `fullscreen` option on `ScreenDef`, `<FullScreen>` component, `useFullScreen` hook, and `useTerminalSize` hook.
- adb2879: Replace `useConfig()`, `useMeta()`, and `useStore()` screen hooks with a single `useCommandContext()` hook that returns a `ScreenContext`. The `ScreenContext` type exposes data properties (`args`, `config`, `meta`, `store`) and middleware-decorated properties (`auth`, `http`, etc.) while omitting imperative I/O properties (`log`, `spinner`, `prompts`, `fail`, `colors`, `format`) that conflict with Ink's rendering model. Remove internal `KiddProvider`, `KiddProviderProps`, `ScreenRenderProps`, `render`, `Instance`, and `RenderOptions` from the public UI exports.

## 0.12.0

### Minor Changes

- ed3eb91: Add module augmentation to report middleware

  - Added `declare module` augmentation so `ctx.report` is typed on all commands when `report()` middleware is registered at the `cli()` level, matching the existing `icons` middleware pattern.
  - Fixed `icons` example to use `ctx.log.raw()` and `ctx.format.table()` instead of removed `ctx.output` API.

## 0.11.0

### Minor Changes

- 9cd2217: Move logger, spinner, and prompts off base Context into a `logger()` middleware (`ctx.log`). Extract diagnostics into a `report()` middleware (`ctx.report`).
- 9e4abdc: Add `screen()` factory for building React/Ink TUI commands. Screens receive parsed args as component props; runtime context is available via `useConfig()`, `useMeta()`, and `useStore()` hooks through a `KiddProvider`. Export all Ink primitives and `@inkjs/ui` components from `@kidd-cli/core/ui`. Add `.tsx`/`.jsx` support to the bundler command scanner.

## 0.10.0

### Minor Changes

- d6e831c: Replace `system_profiler` font detection with pure JS directory scanning, reducing icons middleware startup from ~9.5s to ~140ms on macOS

## 0.9.0

### Minor Changes

- 4beaa57: Add `DirsConfig` option to `cli()` for configuring separate local and global directory names, and fix auth dir mismatch where `login()`/`logout()` hardcoded the store directory while `credential()` respected `auth.file({ dirName })` overrides.

## 0.8.2

### Patch Changes

- 2667bab: fix(packages/core,packages/bundler): exclude .d.ts files from command autoloader

  The `isCommandFile` and `findIndexEntry` functions used `extname()` to check
  file extensions, but `extname('build.d.ts')` returns `'.ts'`, causing `.d.ts`
  declaration files to pass the filter. When `@kidd-cli/cli` is installed under
  `node_modules` and its `dist/commands/` directory contains `.d.ts` files, the
  runtime autoloader attempts to `import()` them, triggering a Node 24 type
  stripping error for files under `node_modules`.

## 0.8.1

### Patch Changes

- e6a1b85: Fix `packages/cli` bin field pointing to `.mjs` instead of `.js` (tsdown with `fixedExtension: false` and `"type":"module"` outputs `.js`). Add `setArgv` and `runTestCli` to the public `@kidd-cli/core/test` entry point.

## 0.8.0

### Minor Changes

- e4ebe22: Add hidden, deprecated, and group support for commands and flags
  - Add `Resolvable<T>` utility type (`T | (() => T)`) for values resolved at registration time
  - Add `hidden` field on `CommandDef` and `YargsArgDef` to omit commands/flags from help output
  - Add `deprecated` field on `CommandDef` and `YargsArgDef` to show deprecation notices
  - Add `group` field on `YargsArgDef` to organize flags under headings in help output
  - Make `description` on `CommandDef` accept `Resolvable<string>` for dynamic resolution
  - All `Resolvable` fields are resolved once at registration time with zero runtime overhead

## 0.7.1

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

## 0.7.0

### Minor Changes

- be28e1c: Add `name` and `aliases` fields to command definitions. The `name` field overrides filename-derived names in the autoloader, and `aliases` registers alternative command names via yargs' native alias support.
- 25b015e: Add `@kidd-cli/core/test` export with test utilities for handler, middleware, and integration testing. Includes `createTestContext`, `runHandler`, `runMiddleware`, `runCommand`, `mockPrompts`, `setupTestLifecycle`, `createWritableCapture`, `stripAnsi`, and `normalizeError`. Also extends `createContext` to accept optional `prompts` and `spinner` overrides for dependency injection.

## 0.6.0

### Minor Changes

- b1c8e9e: Refactor config client to use c12 for all config file resolution

  - Support `name.config.*` patterns (TS, JS, JSON, JSONC, YAML, TOML) via c12
  - Support `name.*` short-form patterns for data formats only (JSON, JSONC, YAML, TOML)
  - Long form (`name.config.*`) takes priority over short form (`name.*`)
  - Change `write()` default path from `.name.jsonc` to `name.config.jsonc`
  - Expand `ConfigFormat` to include `'ts' | 'js'` for TS/JS config files
  - Add `ConfigWriteFormat` type for write-only formats (`'json' | 'jsonc' | 'yaml'`)

- 440fc58: Replace `args` with separate `options` and `positionals` fields on command definitions.

  **Breaking:** The `args` field on `command()` has been removed. Use `options` for flags and `positionals` for positional arguments. Both accept a Zod object schema or a yargs-native record. The `PositionalDef` type has been removed. `ctx.args` remains unchanged at runtime — options and positionals are merged under the hood.

### Patch Changes

- e81d3a8: Replace `font-list` native module with platform-native shell commands for Nerd Font detection, fixing bundling failures caused by `font-list`'s internal `require("./libs/core")` not being preserved by tsdown/rolldown

## 0.5.1

### Patch Changes

- Updated dependencies [5f46e63]
  - @kidd-cli/config@0.1.5

## 0.5.0

### Minor Changes

- a7dff7d: Add icons middleware with Nerd Font detection and interactive installation
- 6d8889a: Add `ConfigType` utility type and `CliConfig` augmentation interface for typed `ctx.config`.

  **@kidd-cli/core:**

  - Add `ConfigType<TSchema>` utility type to derive `CliConfig` from a Zod schema
  - Rename `KiddConfig` augmentation interface to `CliConfig` to avoid confusion with the build config type in `@kidd-cli/config`
  - Export `CliConfig` and `ConfigType` from `@kidd-cli/core`

  **@kidd-cli/cli:**

  - Add `--config` flag to `kidd init` to scaffold config schema setup during project creation
  - Add `kidd add config` command to scaffold config into existing projects
  - Scaffolded config includes Zod schema with `ConfigType` module augmentation wiring

- 70deba8: Redesign output API: replace `ctx.output` with `ctx.format` and add styled logger methods.

  **Breaking changes:**

  - Remove `ctx.output` from the Context (replaced by `ctx.format` and `ctx.logger`)
  - Rename `SYMBOLS`/`Symbols` to `GLYPHS`/`Glyphs`
  - Rename format types: `ResultInput` to `CheckInput`, `DiagnosticInput` to `FindingInput`, `SummaryInput` to `TallyInput`, `TallySummaryInput` to `TallyBlockInput`, `InlineSummaryInput` to `TallyInlineInput`, `ResultStatus` to `CheckStatus`, `DiagnosticSeverity` to `FindingSeverity`
  - Rename format functions: `formatResult` to `formatCheck`, `formatDiagnostic` to `formatFinding`, `formatSummary` to `formatTally`

  **New features:**

  - Add `ctx.format.json(data)` and `ctx.format.table(rows)` — pure string formatters (no I/O)
  - Add `ctx.logger.check(input)` — write a pass/fail/warn/skip/fix row (vitest style)
  - Add `ctx.logger.finding(input)` — write a full finding with optional code frame (oxlint style)
  - Add `ctx.logger.tally(input)` — write a tally block or inline stats footer

  **Migration:**

  ```ts
  // Before
  ctx.output.result(input); // → ctx.logger.check(input)
  ctx.output.diagnostic(input); // → ctx.logger.finding(input)
  ctx.output.summary(input); // → ctx.logger.tally(input)
  ctx.output.write(data); // → process.stdout.write(ctx.format.json(data))
  ctx.output.table(rows); // → process.stdout.write(ctx.format.table(rows))
  ctx.output.raw(text); // → ctx.logger.print(text)
  ctx.output.markdown(text); // → ctx.logger.print(text)
  ```

### Patch Changes

- 0db5742: Refactor autoloader to extract shared filtering/mapping logic into `buildCommandMapFromEntries` helper, eliminating duplication between `autoload()` and `buildSubCommands()`

## 0.4.0

### Minor Changes

- 9f1b155: Auto-detect CLI version from package.json at build time

  The kidd bundler now reads the `version` field from the project's `package.json` during build and injects it as a compile-time constant (`__KIDD_VERSION__`). At runtime, `cli()` no longer requires an explicit `version` option — it falls back to the injected constant automatically. Explicit `version` still takes precedence when provided. The build command output now displays the detected version.

- 2f7137b: Add customizable help header/footer and clean exit on no-command

  Add `CliHelpOptions` type with `header` and `footer` fields. `header` displays custom text (e.g., ASCII logo) above help output only when the CLI is invoked without a command. `footer` displays text below help output on all help (maps to yargs `.epilogue()`). When the CLI is invoked without a command, help is now shown to stdout (exit 0) instead of erroring via `demandCommand`.

- 61e22eb: Restructure commands as a grouped config object

  Replace the flat `commandOrder` option on `cli()` and `order` field on `command()` with a unified `CommandsConfig` object nested inside the `commands` field. The new structure groups command source (`path` or inline `commands` map) alongside display ordering under a single key. Backward compatibility is preserved — `commands` still accepts a plain string path or a `CommandMap`.

- ac61665: Add optional credential validation before persistence in auth middleware

  Add `ValidateCredential` callback type and optional `validate` field on `AuthOptions` (default for all logins) and `LoginOptions` (per-call override). When provided, the callback runs between strategy resolution and `store.save()` — if validation fails the credential is never persisted and a `validation_failed` error is returned. The callback may also transform or enrich the credential before it is saved.

### Patch Changes

- 97b92b7: upgrade dependencies across all packages
- Updated dependencies [97b92b7]
  - @kidd-cli/utils@0.1.4
  - @kidd-cli/config@0.1.4

## 0.3.0

### Minor Changes

- 19b8277: Redesign auth middleware API

  Rename `resolvers` to `strategies` across all auth types and functions. Remove bundled `auth({ http })` option in favor of standalone `http()` middleware. Add `login({ strategies })` override for interactive auth. Add `auth.headers()` factory for resolving auth headers from context. Add `auth.require()` enforcement gate middleware. Add `compose()` middleware combinator for merging multiple middleware into one.

### Patch Changes

- 7042b46: Fix coding standards violations across packages

  Replace `as` type assertions with type annotations, type guards, and documented exceptions. Replace `try/catch` blocks with `attempt`/`attemptAsync` from es-toolkit. Replace multi-branch `if/else` chains with `ts-pattern` `match` expressions. Rename `redactPaths` constant to `REDACT_PATHS`. Document intentional mutation and `throw` exceptions with inline comments.

- 6a538bc: upgrade dependencies across all packages
- Updated dependencies [6a538bc]
  - @kidd-cli/utils@0.1.3
  - @kidd-cli/config@0.1.3

## 0.2.0

### Minor Changes

- f48ad38: Add resolver builder functions, HTTP integration to auth middleware, and decouple standalone http() from auth

  **Resolver builders:** `auth.env()`, `auth.dotenv()`, `auth.file()`, `auth.oauth()`, `auth.deviceCode()`, `auth.token()`, `auth.custom()` provide construction sugar over raw config objects. Raw configs still work.

  **Auth HTTP integration:** `auth({ http: { baseUrl, namespace } })` creates authenticated HTTP clients with automatic credential header injection. Supports single or multiple clients via an array.

  **Breaking changes:**

  - `http()` no longer auto-reads `ctx.auth.credential()`. Use `auth({ http })` for authenticated clients or pass `headers` explicitly.
  - `HttpOptions.defaultHeaders` renamed to `headers` and now accepts a function `(ctx) => Record<string, string>` in addition to a static record.

  Before:

  ```ts
  middleware: [
    auth({ resolvers: [{ source: "env" }] }),
    http({ baseUrl: "https://api.example.com", namespace: "api" }),
  ];
  ```

  After:

  ```ts
  middleware: [
    auth({
      resolvers: [auth.env()],
      http: { baseUrl: "https://api.example.com", namespace: "api" },
    }),
  ];
  ```

- f48ad38: Replace non-standard OAuth flow with spec-compliant PKCE (RFC 7636) and add Device Authorization Grant (RFC 8628)

  The `oauth` resolver now implements the standard OAuth 2.0 Authorization Code flow with PKCE. The previous non-standard direct-token-POST flow has been removed entirely.

  **Breaking change:** `OAuthSourceConfig` now requires `clientId` and `tokenUrl` in addition to `authUrl`.

  Before:

  ```ts
  { source: 'oauth', authUrl: 'https://example.com/auth' }
  ```

  After:

  ```ts
  { source: 'oauth', clientId: 'my-client-id', authUrl: 'https://example.com/authorize', tokenUrl: 'https://example.com/token' }
  ```

  New `device-code` resolver added for headless/browserless environments (RFC 8628).

  **Breaking change:** Remove `lib/output` and `lib/prompts` sub-exports. The `Spinner` interface is now inlined in `context/types.ts` and prompts use `@clack/prompts` directly. Consumers importing from `@kidd-cli/core/lib/output` or `@kidd-cli/core/lib/prompts` must update to use `@clack/prompts` directly.

  **Breaking change:** Export `MiddlewareEnv` type from main entry point.

  **Breaking change:** `DeviceCodeSourceConfig` adds `openBrowser` option (defaults to `true`). Set to `false` for headless/CI/SSH environments.

  Include dotenv resolver in passive credential resolution (`ctx.auth.credential()`) alongside file and env resolvers.

  OAuth callback server now detects provider error redirects (e.g. `?error=access_denied`) and resolves immediately instead of waiting for timeout.

  Device-code and OAuth HTTP requests are now protected by `AbortSignal.timeout` to prevent hanging when endpoints are unresponsive.

  Add `signal` parameter to `postFormEncoded()` for timeout/cancellation support.

### Patch Changes

- fd5bfcd: Harden auth middleware against insecure transport and injection

  Enforce HTTPS on OAuth endpoint URLs (authUrl, tokenUrl, deviceAuthUrl) per RFC 8252 §8.3, allowing HTTP only for loopback addresses used during local redirect flows. Resolvers now return null for non-secure URLs.

  Escape `cmd.exe` metacharacters (`&`, `|`, `<`, `>`, `^`) in URLs passed to `cmd /c start` on Windows to prevent command injection via query strings.

  Remove redundant `existsSync` check in `loadFromPath` to eliminate a TOCTOU race condition, matching the pattern already used in the dotenv resolver.

- Updated dependencies [f48ad38]
  - @kidd-cli/utils@0.1.2
  - @kidd-cli/config@0.1.2

## 0.1.2

### Patch Changes

- 5c78d6a: Fix command export default typing by adding explicit `Command` return type to the `command()` factory and removing unsafe `as unknown as Command` casts from all command modules

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
