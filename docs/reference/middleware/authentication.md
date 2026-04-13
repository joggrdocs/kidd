# Authentication Reference

API reference for the kidd authentication system. For conceptual overview, see [Authentication Concepts](/docs/concepts/authentication).

## Resolver Builders

The `auth` function doubles as a namespace with builder methods for constructing strategy configs. Each builder returns a `StrategyConfig` with the `source` discriminator pre-filled. Raw config objects (`{ source: 'env' }`) still work.

### `auth.env()` -- Environment Variable

Reads a bearer token from `process.env`.

```ts
auth.env({ tokenVar: 'GITHUB_TOKEN' })
```

| Option     | Type     | Default            | Description               |
| ---------- | -------- | ------------------ | ------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Environment variable name |

The default variable name is derived from the CLI name: `my-app` becomes `MY_APP_TOKEN`.

### `auth.dotenv()` -- Dotenv File

Reads a bearer token from a `.env` file without mutating `process.env`.

```ts
auth.dotenv({ tokenVar: 'API_TOKEN', path: './.env.local' })
```

| Option     | Type     | Default            | Description                   |
| ---------- | -------- | ------------------ | ----------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Variable name within the file |
| `path`     | `string` | `$CWD/.env`        | Path to the dotenv file       |

### `auth.file()` -- JSON File

Reads any credential type from a JSON file on disk via kidd's store system.

```ts
auth.file({ filename: 'auth.json', dirName: '.my-app' })
```

| Option     | Type     | Default       | Description                   |
| ---------- | -------- | ------------- | ----------------------------- |
| `filename` | `string` | `'auth.json'` | Filename within the store dir |
| `dirName`  | `string` | `.<cli-name>` | Store directory name          |

### `auth.oauth()` -- OAuth Authorization Code + PKCE (RFC 7636)

Implements the OAuth 2.0 Authorization Code flow with PKCE per [RFC 7636](https://tools.ietf.org/html/rfc7636) and [RFC 8252](https://tools.ietf.org/html/rfc8252) for native apps.

The flow:

1. CLI generates a `code_verifier` and derives the `code_challenge` (S256)
2. CLI starts a local HTTP server on `127.0.0.1` and opens the browser to the authorization URL
3. User authenticates in the browser; the authorization server redirects back with an authorization code
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

Compatible with any OAuth 2.0 provider that supports PKCE with public clients, including Clerk.

### `auth.deviceCode()` -- Device Authorization Grant (RFC 8628)

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

Handles RFC 8628 error codes: `authorization_pending` (continue polling), `slow_down` (increase interval), `expired_token` (return null), and `access_denied` (return null).

Supported by GitHub, Azure AD, and Google. Not supported by Clerk.

### `auth.token()` -- Interactive Token Input

Prompts the user for a token via a masked password input. Aliased as `auth.apiKey()`.

```ts
auth.token({ message: 'Enter your API token:' })
```

| Option    | Type     | Default                | Description    |
| --------- | -------- | ---------------------- | -------------- |
| `message` | `string` | `'Enter your API key'` | Prompt message |

### `auth.custom()` -- User-Provided Function

Calls a user-supplied function that returns a credential or null. The function is passed directly as the argument.

```ts
auth.custom(async () => {
  const token = await fetchTokenFromVault()
  return token ? { type: 'bearer', token } : null
})
```

## AuthContext

The auth middleware decorates `ctx.auth` with the following interface:

| Property          | Type                                     | Description                                     |
| ----------------- | ---------------------------------------- | ----------------------------------------------- |
| `credential()`    | `AuthCredential \| null`                 | Passively resolved credential (file, env)       |
| `authenticated()` | `boolean`                                | Whether a passive credential exists             |
| `login(options?)` | `AsyncResult<AuthCredential, AuthError>` | Run interactive strategies, persist, and return |
| `logout()`        | `AsyncResult<string, AuthError>`         | Remove stored credential from disk              |

### `ctx.auth.login()`

Walks the configured strategies in order, runs each interactive strategy, and persists the first successful credential to the global file store.

```ts
const [error, credential] = await ctx.auth.login()
if (error) {
  ctx.fail(error.message)
}
```

### LoginOptions

`login()` accepts an optional `LoginOptions` object:

| Field        | Type                        | Description                                      |
| ------------ | --------------------------- | ------------------------------------------------ |
| `strategies` | `readonly StrategyConfig[]` | Override the default strategy list for this call |
| `validate`   | `ValidateCredential`        | Validate the credential before persisting        |

### `ctx.auth.logout()`

Removes the stored credential file from the global file store. Returns `ok(filePath)` on success, including when the file did not exist (idempotent).

```ts
const [error] = await ctx.auth.logout()
if (error) {
  ctx.fail(error.message)
}
```

## AuthError

| `type`                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `'no_credential'`     | No strategy produced a credential                    |
| `'save_failed'`       | Credential resolved but failed to persist            |
| `'remove_failed'`     | Failed to remove the credential file                 |
| `'validation_failed'` | Credential resolved but failed the validate callback |

## Credential Types

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

## `auth.require()`

Creates a middleware that checks `ctx.auth.authenticated()` and calls `ctx.fail()` to short-circuit before the handler runs.

```ts
const requireAuth = auth.require()
const requireAuth = auth.require({ message: 'Not authenticated. Run `my-app login` first.' })
```

## `auth.headers()`

Returns a function `(ctx) => headers` that reads `ctx.auth.credential()` and converts it into the appropriate HTTP header format. Returns an empty record when no auth middleware is present or no credential exists.

```ts
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: auth.headers(),
})
```

## Resources

- [RFC 7636 -- Proof Key for Code Exchange](https://tools.ietf.org/html/rfc7636)
- [RFC 8252 -- OAuth 2.0 for Native Apps](https://tools.ietf.org/html/rfc8252)
- [RFC 8628 -- Device Authorization Grant](https://tools.ietf.org/html/rfc8628)

## References

- [Authentication Concepts](/docs/concepts/authentication)
- [HTTP Reference](./http)
- [Context Reference](../framework/context)
- [Add Authentication Guide](/guides/add-authentication)
