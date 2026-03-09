---
'@kidd-cli/core': minor
---

Add resolver builder functions, HTTP integration to auth middleware, and decouple standalone http() from auth

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
