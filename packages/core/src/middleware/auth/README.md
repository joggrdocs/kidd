# Auth Middleware

Resolve credentials from multiple sources and store them in the context for downstream middleware and commands. Resolvers are tried in order; the first successful match wins.

## Usage

```ts
import { cli } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      resolvers: [{ source: 'env' }],
      required: true,
    }),
  ],
  commands: { deploy },
})
```

The resolved credential is stored in `ctx.store` under the `'auth'` key (configurable via `storeKey`). When `required` is `true`, the middleware fails with `AUTH_REQUIRED` if no resolver produces a credential.

## Resolvers

Resolvers are tried in declaration order. The first non-null result is stored and remaining resolvers are skipped.

### env

Reads a bearer token from `process.env`. The variable name defaults to `<CLI_NAME>_TOKEN` (kebab-case converted to `SCREAMING_SNAKE_CASE`).

```ts
auth({
  resolvers: [{ source: 'env', tokenVar: 'GITHUB_TOKEN' }],
})
```

| Option     | Type     | Default            | Description                  |
| ---------- | -------- | ------------------ | ---------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Environment variable to read |

### dotenv

Reads a bearer token from a `.env` file without mutating `process.env`.

```ts
auth({
  resolvers: [{ source: 'dotenv', path: '.env.local' }],
})
```

| Option     | Type     | Default            | Description                   |
| ---------- | -------- | ------------------ | ----------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Variable name inside the file |
| `path`     | `string` | `$CWD/.env`        | Path to the `.env` file       |

### file

Reads a credential from a JSON file on disk using local-then-global resolution. The middleware looks for `./<dirName>/<filename>` in the current directory first, then in the user's home directory.

```ts
auth({
  resolvers: [{ source: 'file', filename: 'credentials.json', dirName: '.my-app' }],
})
```

| Option     | Type     | Default       | Description                   |
| ---------- | -------- | ------------- | ----------------------------- |
| `filename` | `string` | `auth.json`   | Name of the credentials file  |
| `dirName`  | `string` | `.<cli-name>` | Directory containing the file |

The file must contain a valid credential object (see [Credential Types](#credential-types)).

### oauth

OAuth 2.0 Authorization Code + PKCE (RFC 7636 + RFC 8252). Opens the browser, receives an authorization code via GET redirect, and exchanges it at the token endpoint with a PKCE code verifier.

```ts
auth({
  resolvers: [
    {
      source: 'oauth',
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
      scopes: ['openid', 'profile'],
    },
  ],
})
```

| Option         | Type                | Default      | Description                       |
| -------------- | ------------------- | ------------ | --------------------------------- |
| `clientId`     | `string`            | _required_   | OAuth client ID                   |
| `authUrl`      | `string`            | _required_   | Authorization endpoint            |
| `tokenUrl`     | `string`            | _required_   | Token endpoint                    |
| `scopes`       | `readonly string[]` | `[]`         | OAuth scopes to request           |
| `port`         | `number`            | `0` (random) | Local server port                 |
| `callbackPath` | `string`            | `/callback`  | Path the auth server redirects to |
| `timeout`      | `number`            | `120000`     | Timeout in milliseconds           |

### device-code

OAuth 2.0 Device Authorization Grant (RFC 8628). Displays a verification URL and user code, then polls the token endpoint until the user completes authorization.

```ts
auth({
  resolvers: [
    {
      source: 'device-code',
      clientId: 'my-client-id',
      deviceAuthUrl: 'https://example.com/device/code',
      tokenUrl: 'https://example.com/token',
    },
  ],
})
```

| Option          | Type                | Default    | Description                   |
| --------------- | ------------------- | ---------- | ----------------------------- |
| `clientId`      | `string`            | _required_ | OAuth client ID               |
| `deviceAuthUrl` | `string`            | _required_ | Device authorization endpoint |
| `tokenUrl`      | `string`            | _required_ | Token endpoint                |
| `scopes`        | `readonly string[]` | `[]`       | OAuth scopes to request       |
| `pollInterval`  | `number`            | `5000`     | Poll interval in milliseconds |
| `timeout`       | `number`            | `300000`   | Timeout in milliseconds       |

Supported by GitHub, Azure AD, and Google. Not supported by Clerk.

### prompt

Interactively prompts the user for a token via `ctx.prompts.password()`. Best placed last in the resolver chain as a fallback.

```ts
auth({
  resolvers: [{ source: 'prompt', message: 'Enter your GitHub token' }],
})
```

| Option    | Type     | Default              | Description         |
| --------- | -------- | -------------------- | ------------------- |
| `message` | `string` | `Enter your API key` | Prompt message text |

### custom

Supplies a user-defined resolver function. The function returns a credential or `null`.

```ts
auth({
  resolvers: [
    {
      source: 'custom',
      resolver: async () => {
        const token = await fetchTokenFromVault()
        if (!token) return null
        return { type: 'bearer', token }
      },
    },
  ],
})
```

## Configuration

| Option      | Type               | Default    | Description                                     |
| ----------- | ------------------ | ---------- | ----------------------------------------------- |
| `resolvers` | `ResolverConfig[]` | _required_ | Ordered list of credential sources to try       |
| `required`  | `boolean`          | `false`    | Fail if no credential is resolved               |
| `storeKey`  | `string`           | `'auth'`   | Key used to store the credential in `ctx.store` |

## Multiple Auth Sources

Chain resolvers to support multiple credential discovery strategies. The first match wins:

```ts
auth({
  resolvers: [
    { source: 'env', tokenVar: 'GITHUB_TOKEN' },
    { source: 'dotenv' },
    { source: 'file' },
    { source: 'prompt', message: 'Enter your GitHub token' },
  ],
  required: true,
})
```

## Credential Types

All resolvers produce one of four credential variants, discriminated by the `type` field:

| Type      | Fields                 | Header Format                            |
| --------- | ---------------------- | ---------------------------------------- |
| `bearer`  | `token`                | `Authorization: Bearer <token>`          |
| `basic`   | `username`, `password` | `Authorization: Basic base64(user:pass)` |
| `api-key` | `headerName`, `key`    | `<headerName>: <key>`                    |
| `custom`  | `headers`              | Arbitrary headers from the record        |

The `env`, `dotenv`, `prompt`, `oauth`, and `device-code` resolvers always produce `bearer` credentials. The `file` and `custom` resolvers can produce any variant.

## Module Augmentation

Augment `KiddStore` to get typed access to the credential in `ctx.store`:

```ts
declare module '@kidd-cli/core' {
  interface KiddStore {
    auth: AuthCredential
  }
}
```
