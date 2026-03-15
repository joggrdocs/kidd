# kidd

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
    auth({ resolvers: [{ source: 'env' }] }),
    http({ baseUrl: 'https://api.example.com', namespace: 'api' }),
  ]
  ```

  After:

  ```ts
  middleware: [
    auth({
      resolvers: [auth.env()],
      http: { baseUrl: 'https://api.example.com', namespace: 'api' },
    }),
  ]
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
