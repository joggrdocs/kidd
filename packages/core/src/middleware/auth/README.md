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

| Option     | Type     | Default            | Description                    |
| ---------- | -------- | ------------------ | ------------------------------ |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Environment variable to read   |

### dotenv

Reads a bearer token from a `.env` file without mutating `process.env`.

```ts
auth({
  resolvers: [{ source: 'dotenv', path: '.env.local' }],
})
```

| Option     | Type     | Default            | Description                     |
| ---------- | -------- | ------------------ | ------------------------------- |
| `tokenVar` | `string` | `<CLI_NAME>_TOKEN` | Variable name inside the file   |
| `path`     | `string` | `$CWD/.env`        | Path to the `.env` file         |

### file

Reads a credential from a JSON file on disk using local-then-global resolution. The middleware looks for `./<dirName>/<filename>` in the current directory first, then in the user's home directory.

```ts
auth({
  resolvers: [{ source: 'file', filename: 'credentials.json', dirName: '.my-app' }],
})
```

| Option     | Type     | Default           | Description                        |
| ---------- | -------- | ----------------- | ---------------------------------- |
| `filename` | `string` | `auth.json`       | Name of the credentials file       |
| `dirName`  | `string` | `.<cli-name>`     | Directory containing the file      |

The file must contain a valid credential object (see [Credential Types](#credential-types)).

### oauth

Opens the user's browser for an OAuth flow. A local HTTP server listens for the callback token.

```ts
auth({
  resolvers: [
    {
      source: 'oauth',
      authUrl: 'https://example.com/authorize',
      port: 3000,
      timeout: 60_000,
    },
  ],
})
```

| Option         | Type     | Default       | Description                         |
| -------------- | -------- | ------------- | ----------------------------------- |
| `authUrl`      | `string` | *required*    | OAuth authorization URL             |
| `port`         | `number` | `0` (random)  | Local server port                   |
| `callbackPath` | `string` | `/callback`   | Path the auth server redirects to   |
| `timeout`      | `number` | `120000`      | Timeout in milliseconds             |

### prompt

Interactively prompts the user for a token via `ctx.prompts.password()`. Best placed last in the resolver chain as a fallback.

```ts
auth({
  resolvers: [{ source: 'prompt', message: 'Enter your GitHub token' }],
})
```

| Option    | Type     | Default                | Description          |
| --------- | -------- | ---------------------- | -------------------- |
| `message` | `string` | `Enter your API key`   | Prompt message text  |

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

| Option      | Type               | Default   | Description                                       |
| ----------- | ------------------ | --------- | ------------------------------------------------- |
| `resolvers` | `ResolverConfig[]` | *required* | Ordered list of credential sources to try         |
| `required`  | `boolean`          | `false`   | Fail if no credential is resolved                 |
| `storeKey`  | `string`           | `'auth'`  | Key used to store the credential in `ctx.store`   |

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

| Type      | Fields                        | Header Format                              |
| --------- | ----------------------------- | ------------------------------------------ |
| `bearer`  | `token`                       | `Authorization: Bearer <token>`            |
| `basic`   | `username`, `password`        | `Authorization: Basic base64(user:pass)`   |
| `api-key` | `headerName`, `key`           | `<headerName>: <key>`                      |
| `custom`  | `headers`                     | Arbitrary headers from the record          |

The `env`, `dotenv`, `prompt`, and `oauth` resolvers always produce `bearer` credentials. The `file` and `custom` resolvers can produce any variant.

## Module Augmentation

Augment `KiddStore` to get typed access to the credential in `ctx.store`:

```ts
declare module '@kidd-cli/core' {
  interface KiddStore {
    auth: AuthCredential
  }
}
```
