# Authentication

The auth system for kidd CLIs. Provides credential resolution from multiple sources, an interactive login flow, persistent token storage, and automatic HTTP header injection.

Auth is a sub-export of the `kidd` package (`kidd/auth`), not a separate package. It ships as middleware that decorates `ctx.auth` with a `credential()` reader and an `authenticate()` method.

## Key Concepts

### Passive vs Interactive Resolution

Auth resolvers are split into two categories:

- **Passive** resolvers run automatically when the middleware initializes. They check non-interactive sources (file store, environment variables) without prompting the user. The first match wins.
- **Interactive** resolvers run only when the handler explicitly calls `ctx.auth.authenticate()`. They prompt the user (OAuth browser flow, password input) or call a custom function.

This split allows commands to work without auth when no credential is found, and only prompt when a command actually needs authentication.

### Credential Types

All credentials use a discriminated union on the `type` field:

| Type      | Interface           | HTTP Header                             |
| --------- | ------------------- | --------------------------------------- |
| `bearer`  | `BearerCredential`  | `Authorization: Bearer <token>`         |
| `basic`   | `BasicCredential`   | `Authorization: Basic base64(user:pass)` |
| `api-key` | `ApiKeyCredential`  | `<headerName>: <key>`                   |
| `custom`  | `CustomCredential`  | Arbitrary `headers` record              |

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

| Location | Path                            | Resolution order |
| -------- | ------------------------------- | ---------------- |
| Local    | `./<cli-name>/auth.json`        | Checked first    |
| Global   | `~/<cli-name>/auth.json`        | Checked second   |

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

| Option     | Type     | Default               | Description                     |
| ---------- | -------- | --------------------- | ------------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN`    | Environment variable name       |

The default variable name is derived from the CLI name: `my-app` becomes `MY_APP_TOKEN`.

### `dotenv` -- Dotenv File

Reads a bearer token from a `.env` file without mutating `process.env`.

```ts
{ source: 'dotenv', tokenVar: 'API_TOKEN', path: './.env.local' }
```

| Option     | Type     | Default            | Description                     |
| ---------- | -------- | ------------------ | ------------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Variable name within the file   |
| `path`     | `string` | `$CWD/.env`        | Path to the dotenv file         |

### `file` -- JSON File

Reads any credential type from a JSON file on disk via kidd's store system.

```ts
{ source: 'file', filename: 'auth.json', dirName: '.my-app' }
```

| Option     | Type     | Default           | Description                       |
| ---------- | -------- | ----------------- | --------------------------------- |
| `filename` | `string` | `'auth.json'`     | Filename within the store dir     |
| `dirName`  | `string` | `.<cli-name>`     | Store directory name              |

### `oauth` -- OAuth Browser Flow

Opens the user's browser to an auth URL, starts a local HTTP server to receive the callback, and extracts the token from a POST request with a JSON body `{ "token": "<value>" }`. Query-string tokens are not accepted to prevent credential leakage through browser history, server logs, and referrer headers.

```ts
{ source: 'oauth', authUrl: 'https://example.com/auth', port: 0, timeout: 120_000 }
```

| Option         | Type     | Default        | Description                                  |
| -------------- | -------- | -------------- | -------------------------------------------- |
| `authUrl`      | `string` | --             | Authorization URL (required)                 |
| `port`         | `number` | `0` (random)   | Local server port                            |
| `callbackPath` | `string` | `'/callback'`  | Callback endpoint path                       |
| `timeout`      | `number` | `120_000`      | Timeout in milliseconds                      |

The auth URL receives a `callback_url` query parameter pointing to the local server. The OAuth provider must POST a JSON body `{ "token": "<value>" }` to this URL on success.

### `prompt` -- Interactive Password Input

Prompts the user for a token via a masked password input.

```ts
{ source: 'prompt', message: 'Enter your API token:' }
```

| Option    | Type     | Default                  | Description           |
| --------- | -------- | ------------------------ | --------------------- |
| `message` | `string` | `'Enter your API key'`   | Prompt message        |

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

| Option     | Type                                                     | Description         |
| ---------- | -------------------------------------------------------- | ------------------- |
| `resolver` | `() => Promise<AuthCredential \| null> \| AuthCredential \| null` | Resolver function |

## AuthContext

The auth middleware decorates `ctx.auth` with an `AuthContext`:

| Property          | Type                                          | Description                                    |
| ----------------- | --------------------------------------------- | ---------------------------------------------- |
| `credential()`    | `AuthCredential \| null`                      | Passively resolved credential (file, env)      |
| `authenticated()` | `boolean`                                     | Whether a passive credential exists            |
| `authenticate()`  | `AsyncResult<AuthCredential, LoginError>`     | Run interactive resolvers, persist, and return  |

### `ctx.auth.authenticate()`

Walks the configured resolvers in order, runs each interactive resolver, and persists the first successful credential to the global file store.

```ts
const [error, credential] = await ctx.auth.authenticate()
if (error) {
  ctx.fail(error.message)
}
```

| LoginError `type`   | Description                                    |
| ------------------- | ---------------------------------------------- |
| `'no_credential'`   | No resolver produced a credential              |
| `'save_failed'`     | Credential resolved but failed to persist      |

## HTTP Integration

The `http()` middleware (from `kidd/http`) reads `ctx.auth.credential()` automatically. When both middleware are registered, auth credentials are converted to HTTP headers using exhaustive pattern matching on the credential type.

```ts
import { auth } from 'kidd/auth'
import { http } from 'kidd/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({ resolvers: [{ source: 'oauth', authUrl: 'https://example.com/auth' }] }),
    http({ baseUrl: 'https://api.example.com', namespace: 'api' }),
  ],
  commands: { login, repos },
})
```

Header priority (lowest to highest): auth credential headers, default headers, per-request headers.

## References

- [kidd API Reference](../reference/kidd.md)
- [Context](./context.md)
- [Add Authentication Guide](../guides/add-authentication.md)
