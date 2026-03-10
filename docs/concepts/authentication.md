# Authentication

The auth system for kidd CLIs. Provides credential resolution from multiple sources, an interactive login flow, persistent token storage, and automatic HTTP header injection.

Auth is a sub-export of the `@kidd-cli/core` package (`@kidd-cli/core/auth`), not a separate package. It ships as middleware that decorates `ctx.auth` with a `credential()` reader, a `login()` method, and a `logout()` method.

## Key Concepts

### Passive vs Interactive Resolution

Auth resolvers are split into two categories:

- **Passive** resolvers run automatically when the middleware initializes. They check non-interactive sources (file store, environment variables) without prompting the user. The first match wins.
- **Interactive** resolvers run only when the handler explicitly calls `ctx.auth.login()`. They prompt the user (OAuth browser flow, password input) or call a custom function.

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

## Resolver Builders

The `auth` function doubles as a namespace with builder methods for constructing resolver configs. Each builder returns the same `ResolverConfig` type with the `source` discriminator pre-filled. Raw config objects (`{ source: 'env' }`) still work.

```ts
import { auth } from '@kidd-cli/core/auth'

auth({
  resolvers: [
    // Passive (run automatically)
    auth.env(),
    auth.env({ tokenVar: 'GH_TOKEN' }),
    auth.dotenv(),
    auth.dotenv({ tokenVar: 'API_TOKEN', path: '.env.local' }),
    auth.file(),
    auth.file({ filename: 'creds.json', dirName: '.my-app' }),

    // Interactive (run on ctx.auth.login())
    auth.oauth({
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
      scopes: ['openid', 'profile'],
    }),
    auth.deviceCode({
      clientId: 'my-client-id',
      deviceAuthUrl: 'https://example.com/device/code',
      tokenUrl: 'https://example.com/token',
    }),
    auth.token(),
    auth.token({ message: 'Enter token:' }),
    auth.custom(async () => {
      const token = await fetchTokenFromVault()
      return token ? { type: 'bearer', token } : null
    }),

    // Raw config objects still work (backward compatible)
    { source: 'env', tokenVar: 'LEGACY_TOKEN' },
  ],
})
```

## Resolvers

### `env` -- Environment Variable

Reads a bearer token from `process.env`.

```ts
auth.env({ tokenVar: 'GITHUB_TOKEN' })
```

| Option     | Type     | Default            | Description               |
| ---------- | -------- | ------------------ | ------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Environment variable name |

The default variable name is derived from the CLI name: `my-app` becomes `MY_APP_TOKEN`.

### `dotenv` -- Dotenv File

Reads a bearer token from a `.env` file without mutating `process.env`.

```ts
auth.dotenv({ tokenVar: 'API_TOKEN', path: './.env.local' })
```

| Option     | Type     | Default            | Description                   |
| ---------- | -------- | ------------------ | ----------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Variable name within the file |
| `path`     | `string` | `$CWD/.env`        | Path to the dotenv file       |

### `file` -- JSON File

Reads any credential type from a JSON file on disk via kidd's store system.

```ts
auth.file({ filename: 'auth.json', dirName: '.my-app' })
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
auth.oauth({
  clientId: 'my-client-id',
  authUrl: 'https://example.com/authorize',
  tokenUrl: 'https://example.com/token',
  scopes: ['openid', 'profile'],
})
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
auth.deviceCode({
  clientId: 'my-client-id',
  deviceAuthUrl: 'https://example.com/device/code',
  tokenUrl: 'https://example.com/token',
  scopes: ['openid'],
})
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

### `token` -- Interactive Token Input

Prompts the user for a token via a masked password input. Aliased as `auth.apiKey()`.

```ts
auth.token({ message: 'Enter your API token:' })
```

| Option    | Type     | Default                | Description    |
| --------- | -------- | ---------------------- | -------------- |
| `message` | `string` | `'Enter your API key'` | Prompt message |

### `custom` -- User-Provided Function

Calls a user-supplied function that returns a credential or null. The function is passed directly as the argument (not wrapped in an options object).

```ts
auth.custom(async () => {
  const token = await fetchTokenFromVault()
  return token ? { type: 'bearer', token } : null
})
```

## AuthContext

The auth middleware decorates `ctx.auth` with an `AuthContext`:

| Property          | Type                                     | Description                                    |
| ----------------- | ---------------------------------------- | ---------------------------------------------- |
| `credential()`    | `AuthCredential \| null`                 | Passively resolved credential (file, env)      |
| `authenticated()` | `boolean`                                | Whether a passive credential exists            |
| `login()`         | `AsyncResult<AuthCredential, AuthError>` | Run interactive resolvers, persist, and return |
| `logout()`        | `AsyncResult<string, AuthError>`         | Remove stored credential from disk             |

### `ctx.auth.login()`

Walks the configured resolvers in order, runs each interactive resolver, and persists the first successful credential to the global file store.

```ts
const [error, credential] = await ctx.auth.login()
if (error) {
  ctx.fail(error.message)
}
```

### `ctx.auth.logout()`

Removes the stored credential file from the global file store. Returns `ok(filePath)` on success, including when the file did not exist (idempotent).

```ts
const [error] = await ctx.auth.logout()
if (error) {
  ctx.fail(error.message)
}
```

### AuthError

| AuthError `type`  | Description                               |
| ----------------- | ----------------------------------------- |
| `'no_credential'` | No resolver produced a credential         |
| `'save_failed'`   | Credential resolved but failed to persist |
| `'remove_failed'` | Failed to remove the credential file      |

## Requiring Authentication

Auth is opt-in by default. The `auth()` middleware decorates `ctx.auth` with credential readers but never blocks command execution. Commands that run without a credential (public commands, the login command itself) work without any extra configuration.

To enforce authentication, write a custom middleware that checks `ctx.auth.authenticated()` and calls `ctx.fail()` to short-circuit before the handler runs:

```ts
import { middleware } from '@kidd-cli/core'

const requireAuth = middleware((ctx, next) => {
  if (!ctx.auth.authenticated()) {
    return ctx.fail('Not authenticated. Run `my-app login` first.')
  }

  return next()
})
```

### Command-level enforcement

Apply the middleware to individual commands via the `middleware` array. This is the recommended approach when only some commands require authentication (login, help, and version remain open).

```ts
import { command } from '@kidd-cli/core'
import requireAuth from '../middleware/require-auth.js'

export default command({
  description: 'List repositories',
  middleware: [requireAuth],
  handler: async (ctx) => {
    const res = await ctx.api.get('/repos')
    ctx.output.table(res.data)
  },
})
```

### Global enforcement

Apply the middleware to the root `middleware` array to enforce authentication on every command. Place it after `auth()` since it depends on `ctx.auth`.

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [auth({ resolvers: [auth.env(), auth.token()] }), requireAuth],
  commands: `${import.meta.dirname}/commands`,
})
```

When applied globally, all commands -- including login -- must pass the check. Use command-level enforcement when some commands need to run unauthenticated.

See the [Add Authentication guide](../guides/add-authentication.md#3-guard-commands-that-require-auth) for step-by-step instructions.

## HTTP Integration

Auth supports built-in HTTP client creation via the `http` option. When provided, the auth middleware creates HTTP client(s) with automatic credential header injection and decorates them onto `ctx[namespace]`.

```ts
import { auth } from '@kidd-cli/core/auth'

// Single HTTP client
cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      resolvers: [
        auth.env(),
        auth.oauth({
          clientId: 'my-client-id',
          authUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
        }),
      ],
      http: { baseUrl: 'https://api.example.com', namespace: 'api' },
    }),
  ],
  commands: { login, repos },
})
```

```ts
// Multiple HTTP clients
auth({
  resolvers: [auth.env()],
  http: [
    { baseUrl: 'https://api.example.com', namespace: 'api' },
    { baseUrl: 'https://admin.example.com', namespace: 'admin' },
  ],
})
```

Both `ctx.api` and `ctx.admin` get auth credential headers injected automatically. Additional static headers can be passed via `headers` on each entry.

Header priority (lowest to highest): auth credential headers, static headers, per-request headers.

### Standalone `http()` Middleware

The standalone `http()` middleware (from `@kidd-cli/core/http`) does not read from `ctx.auth`. Use it for public APIs or when providing headers explicitly.

```ts
import { http } from '@kidd-cli/core/http'

// Static headers
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: { 'X-Api-Key': 'abc123' },
})

// Dynamic headers via function
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: (ctx) => ({
    Authorization: `Bearer ${ctx.vault.getToken()}`,
  }),
})

// No headers (public API)
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
})
```

## Resources

- [RFC 7636 -- Proof Key for Code Exchange](https://tools.ietf.org/html/rfc7636)
- [RFC 8252 -- OAuth 2.0 for Native Apps](https://tools.ietf.org/html/rfc8252)
- [RFC 8628 -- Device Authorization Grant](https://tools.ietf.org/html/rfc8628)

## References

- [kidd API Reference](../reference/kidd.md)
- [Context](./context.md)
- [Add Authentication Guide](../guides/add-authentication.md)
