# Authentication

The auth system for kidd CLIs. Provides credential resolution from multiple sources, an interactive login flow, persistent token storage, and automatic HTTP header injection.

Auth is a sub-export of the `@kidd-cli/core` package (`@kidd-cli/core/auth`), not a separate package. It ships as middleware that decorates `ctx.auth` with a `credential()` reader and an `authenticate()` method.

## Key Concepts

### Passive vs Interactive Resolution

Auth resolvers are split into two categories:

- **Passive** resolvers run automatically when the middleware initializes. They check non-interactive sources (file store, environment variables) without prompting the user. The first match wins.
- **Interactive** resolvers run only when the handler explicitly calls `ctx.auth.authenticate()`. They prompt the user (OAuth browser flow, password input) or call a custom function.

This split allows commands to work without auth when no credential is found, and only prompt when a command actually needs authentication.

### Credential Types

All credentials use a discriminated union on the `type` field:

| Type      | Interface          | HTTP Header                              |
| --------- | ------------------ | ---------------------------------------- |
| `bearer`  | `BearerCredential` | `Authorization: Bearer <token>`          |
| `basic`   | `BasicCredential`  | `Authorization: Basic base64(user:pass)` |
| `api-key` | `ApiKeyCredential` | `<headerName>: <key>`                    |
| `custom`  | `CustomCredential` | Arbitrary `headers` record               |

```ts
interface BearerCredential {
  readonly type: 'bearer'
  readonly token: string
}

interface BasicCredential {
  readonly type: 'basic'
  readonly username: string
  readonly password: string
}

interface ApiKeyCredential {
  readonly type: 'api-key'
  readonly headerName: string
  readonly key: string
}

interface CustomCredential {
  readonly type: 'custom'
  readonly headers: Readonly<Record<string, string>>
}
```

### Token Storage

Credentials are persisted as JSON files using kidd's file store system.

| Location | Path                     | Resolution order |
| -------- | ------------------------ | ---------------- |
| Local    | `./<cli-name>/auth.json` | Checked first    |
| Global   | `~/<cli-name>/auth.json` | Checked second   |

The file contains the raw credential object:

```json
{
  "type": "bearer",
  "token": "ghp_abc123..."
}
```

Credentials loaded from disk are validated against a Zod schema. Invalid data is silently ignored (returns null).

## Resolvers

### `env` -- Environment Variable

Reads a bearer token from `process.env`.

```ts
{ source: 'env', tokenVar: 'GITHUB_TOKEN' }
```

| Option     | Type     | Default            | Description               |
| ---------- | -------- | ------------------ | ------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Environment variable name |

The default variable name is derived from the CLI name: `my-app` becomes `MY_APP_TOKEN`.

### `dotenv` -- Dotenv File

Reads a bearer token from a `.env` file without mutating `process.env`.

```ts
{ source: 'dotenv', tokenVar: 'API_TOKEN', path: './.env.local' }
```

| Option     | Type     | Default            | Description                   |
| ---------- | -------- | ------------------ | ----------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Variable name within the file |
| `path`     | `string` | `$CWD/.env`        | Path to the dotenv file       |

### `file` -- JSON File

Reads any credential type from a JSON file on disk via kidd's store system.

```ts
{ source: 'file', filename: 'auth.json', dirName: '.my-app' }
```

| Option     | Type     | Default       | Description                   |
| ---------- | -------- | ------------- | ----------------------------- |
| `filename` | `string` | `'auth.json'` | Filename within the store dir |
| `dirName`  | `string` | `.<cli-name>` | Store directory name          |

### `oauth` -- OAuth Authorization Code + PKCE (RFC 7636)

Implements the standard OAuth 2.0 Authorization Code flow with Proof Key for Code Exchange (PKCE) per [RFC 7636](https://tools.ietf.org/html/rfc7636) and [RFC 8252](https://tools.ietf.org/html/rfc8252) for native apps.

The flow:

1. CLI generates a `code_verifier` and derives the `code_challenge` (S256)
2. CLI starts a local HTTP server on `127.0.0.1` and opens the browser to the authorization URL
3. User authenticates in the browser; the authorization server redirects back to the local server with an authorization code via GET
4. CLI exchanges the code at the token endpoint with the `code_verifier`
5. Token endpoint validates the verifier and returns an access token

```ts
{
  source: 'oauth',
  clientId: 'my-client-id',
  authUrl: 'https://example.com/authorize',
  tokenUrl: 'https://example.com/token',
  scopes: ['openid', 'profile'],
}
```

| Option         | Type                | Default       | Description                       |
| -------------- | ------------------- | ------------- | --------------------------------- |
| `clientId`     | `string`            | --            | OAuth client ID (required)        |
| `authUrl`      | `string`            | --            | Authorization endpoint (required) |
| `tokenUrl`     | `string`            | --            | Token endpoint (required)         |
| `scopes`       | `readonly string[]` | `[]`          | OAuth scopes to request           |
| `port`         | `number`            | `0` (random)  | Local callback server port        |
| `callbackPath` | `string`            | `'/callback'` | Callback endpoint path            |
| `timeout`      | `number`            | `120_000`     | Timeout in milliseconds           |

Compatible with any OAuth 2.0 provider that supports PKCE with public clients, including Clerk (configured as a public OAuth application).

### `device-code` -- Device Authorization Grant (RFC 8628)

Implements the [OAuth 2.0 Device Authorization Grant](https://tools.ietf.org/html/rfc8628) for headless or browserless environments.

The flow:

1. CLI requests a device code from the authorization server
2. CLI displays a verification URL and user code for the user to enter in a browser
3. CLI polls the token endpoint until the user completes authorization
4. Token endpoint returns an access token on success

```ts
{
  source: 'device-code',
  clientId: 'my-client-id',
  deviceAuthUrl: 'https://example.com/device/code',
  tokenUrl: 'https://example.com/token',
  scopes: ['openid'],
}
```

| Option          | Type                | Default   | Description                              |
| --------------- | ------------------- | --------- | ---------------------------------------- |
| `clientId`      | `string`            | --        | OAuth client ID (required)               |
| `deviceAuthUrl` | `string`            | --        | Device authorization endpoint (required) |
| `tokenUrl`      | `string`            | --        | Token endpoint (required)                |
| `scopes`        | `readonly string[]` | `[]`      | OAuth scopes to request                  |
| `pollInterval`  | `number`            | `5_000`   | Poll interval in milliseconds            |
| `timeout`       | `number`            | `300_000` | Timeout in milliseconds                  |

The device code flow handles RFC 8628 error codes: `authorization_pending` (continue polling), `slow_down` (increase interval), `expired_token` (return null), and `access_denied` (return null).

Supported by GitHub, Azure AD, and Google. Not supported by Clerk.

### `prompt` -- Interactive Password Input

Prompts the user for a token via a masked password input.

```ts
{ source: 'prompt', message: 'Enter your API token:' }
```

| Option    | Type     | Default                | Description    |
| --------- | -------- | ---------------------- | -------------- |
| `message` | `string` | `'Enter your API key'` | Prompt message |

### `custom` -- User-Provided Function

Calls a user-supplied function that returns a credential or null.

```ts
{
  source: 'custom',
  resolver: async () => {
    const token = await fetchTokenFromVault()
    return token ? { type: 'bearer', token } : null
  },
}
```

| Option     | Type                                                              | Description       |
| ---------- | ----------------------------------------------------------------- | ----------------- |
| `resolver` | `() => Promise<AuthCredential \| null> \| AuthCredential \| null` | Resolver function |

## AuthContext

The auth middleware decorates `ctx.auth` with an `AuthContext`:

| Property          | Type                                      | Description                                    |
| ----------------- | ----------------------------------------- | ---------------------------------------------- |
| `credential()`    | `AuthCredential \| null`                  | Passively resolved credential (file, env)      |
| `authenticated()` | `boolean`                                 | Whether a passive credential exists            |
| `authenticate()`  | `AsyncResult<AuthCredential, LoginError>` | Run interactive resolvers, persist, and return |

### `ctx.auth.authenticate()`

Walks the configured resolvers in order, runs each interactive resolver, and persists the first successful credential to the global file store.

```ts
const [error, credential] = await ctx.auth.authenticate()
if (error) {
  ctx.fail(error.message)
}
```

| LoginError `type` | Description                               |
| ----------------- | ----------------------------------------- |
| `'no_credential'` | No resolver produced a credential         |
| `'save_failed'`   | Credential resolved but failed to persist |

## HTTP Integration

The `http()` middleware (from `kidd/http`) reads `ctx.auth.credential()` automatically. When both middleware are registered, auth credentials are converted to HTTP headers using exhaustive pattern matching on the credential type.

```ts
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      resolvers: [
        {
          source: 'oauth',
          clientId: 'my-client-id',
          authUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
        },
      ],
    }),
    http({ baseUrl: 'https://api.example.com', namespace: 'api' }),
  ],
  commands: { login, repos },
})
```

Header priority (lowest to highest): auth credential headers, default headers, per-request headers.

## Resources

- [RFC 7636 -- Proof Key for Code Exchange](https://tools.ietf.org/html/rfc7636)
- [RFC 8252 -- OAuth 2.0 for Native Apps](https://tools.ietf.org/html/rfc8252)
- [RFC 8628 -- Device Authorization Grant](https://tools.ietf.org/html/rfc8628)

## References

- [kidd API Reference](../reference/kidd.md)
- [Context](./context.md)
- [Add Authentication Guide](../guides/add-authentication.md)
