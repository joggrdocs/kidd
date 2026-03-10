---
'@kidd-cli/core': minor
---

Replace non-standard OAuth flow with spec-compliant PKCE (RFC 7636) and add Device Authorization Grant (RFC 8628)

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
