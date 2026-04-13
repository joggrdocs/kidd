# Authentication

The auth system for kidd CLIs. Provides credential resolution from multiple sources, an interactive login flow, persistent token storage, and automatic HTTP header injection.

Auth is a sub-export of the `@kidd-cli/core` package (`@kidd-cli/core/auth`), not a separate package. It ships as middleware that decorates `ctx.auth` with a `credential()` reader, a `login()` method, and a `logout()` method.

## Key Concepts

### Passive vs Interactive Resolution

Auth strategies are split into two categories:

- **Passive** strategies run automatically when the middleware initializes. They check non-interactive sources (file store, environment variables) without prompting the user. The first match wins.
- **Interactive** strategies run only when the handler explicitly calls `ctx.auth.login()`. They prompt the user (OAuth browser flow, password input) or call a custom function.

This split allows commands to work without auth when no credential is found, and only prompt when a command actually needs authentication.

### Credential Types

All credentials use a discriminated union on the `type` field:

| Type      | HTTP Header                              |
| --------- | ---------------------------------------- |
| `bearer`  | `Authorization: Bearer <token>`          |
| `basic`   | `Authorization: Basic base64(user:pass)` |
| `api-key` | `<headerName>: <key>`                    |
| `custom`  | Arbitrary `headers` record               |

See the [Authentication Reference](/reference/middleware/authentication#credential-types) for full interface definitions.

### Token Storage

Credentials are persisted as JSON files using kidd's file store system.

| Location | Path                     | Resolution order |
| -------- | ------------------------ | ---------------- |
| Local    | `./<cli-name>/auth.json` | Checked first    |
| Global   | `~/<cli-name>/auth.json` | Checked second   |

Credentials loaded from disk are validated against a Zod schema. Invalid data is silently ignored (returns null).

## Resolvers

The `auth` namespace provides builder methods for constructing strategy configs. Each returns a `StrategyConfig` with the `source` discriminator pre-filled.

**Passive** (run automatically):

- `auth.env()` -- reads a bearer token from `process.env`
- `auth.dotenv()` -- reads a bearer token from a `.env` file
- `auth.file()` -- reads any credential type from a JSON file on disk

**Interactive** (run on `ctx.auth.login()`):

- `auth.oauth()` -- OAuth 2.0 Authorization Code + PKCE ([RFC 7636](https://tools.ietf.org/html/rfc7636))
- `auth.deviceCode()` -- Device Authorization Grant ([RFC 8628](https://tools.ietf.org/html/rfc8628))
- `auth.token()` -- prompts the user for a token via masked input
- `auth.custom()` -- calls a user-supplied async function

```ts
import { auth } from '@kidd-cli/core/auth'

auth({
  strategies: [
    auth.env(),
    auth.file(),
    auth.oauth({
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
    }),
  ],
})
```

See the [Authentication Reference](/reference/middleware/authentication#resolver-builders) for full options tables.

## Requiring Authentication

Auth is opt-in by default. The `auth()` middleware decorates `ctx.auth` with credential readers but never blocks command execution.

Use `auth.require()` to create a middleware that checks `ctx.auth.authenticated()` and calls `ctx.fail()` before the handler runs:

```ts
import { auth } from '@kidd-cli/core/auth'

const requireAuth = auth.require()
```

You can customize the error message:

```ts
const requireAuth = auth.require({ message: 'Not authenticated. Run `my-app login` first.' })
```

### Command-level enforcement

Apply the middleware to individual commands. This is the recommended approach when only some commands require authentication.

```ts
import { command } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'

const requireAuth = auth.require()

export default command({
  description: 'List repositories',
  middleware: [requireAuth],
  handler: async (ctx) => {
    // handler logic here
  },
})
```

### Global enforcement

Apply the middleware to the root `middleware` array. Place it after `auth()` since it depends on `ctx.auth`.

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [auth({ strategies: [auth.env(), auth.token()] }), auth.require()],
  commands: `${import.meta.dirname}/commands`,
})
```

When applied globally, all commands -- including login -- must pass the check. Use command-level enforcement when some commands need to run unauthenticated.

See the [Add Authentication guide](/guides/add-authentication#4-guard-commands-that-require-auth) for step-by-step instructions.

## HTTP Integration

Auth and HTTP are separate middleware. Use `auth.headers()` to inject credentials into HTTP requests automatically.

```ts
import { cli } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      strategies: [auth.env(), auth.oauth({
        clientId: 'my-client-id',
        authUrl: 'https://example.com/authorize',
        tokenUrl: 'https://example.com/token',
      })],
    }),
    http({
      baseUrl: 'https://api.example.com',
      namespace: 'api',
      headers: auth.headers(),
    }),
  ],
  commands: { login, repos },
})
```

Place `auth()` before `http()` in the middleware array so that `ctx.auth` is available when HTTP requests resolve headers.

## Resources

- [RFC 7636 -- Proof Key for Code Exchange](https://tools.ietf.org/html/rfc7636)
- [RFC 8252 -- OAuth 2.0 for Native Apps](https://tools.ietf.org/html/rfc8252)
- [RFC 8628 -- Device Authorization Grant](https://tools.ietf.org/html/rfc8628)

## References

- [Authentication Reference](/reference/middleware/authentication)
- [Core Reference](/reference/packages/kidd)
- [Context](./context.md)
- [HTTP](./http.md)
- [HTTP Reference](/reference/middleware/http)
- [Add Authentication Guide](/guides/add-authentication)
