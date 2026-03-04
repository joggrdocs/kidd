# HTTP Middleware

Typed HTTP client middleware that decorates the context with a namespaced `HttpClient`. Integrates with the [auth middleware](../auth/README.md) to automatically attach credentials to outgoing requests.

## Usage

```ts
import { cli } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      resolvers: [{ source: 'env', tokenVar: 'GITHUB_TOKEN' }],
      required: true,
    }),
    http({
      namespace: 'github',
      baseUrl: 'https://api.github.com',
    }),
  ],
  commands: { repos },
})
```

The middleware reads credentials from `ctx.store` (written by the auth middleware), creates an `HttpClient` bound to the base URL, and attaches it to `ctx[namespace]`. After creating the client, credentials are cleared from the store by default.

## Module Augmentation

Augment the `Context` interface so TypeScript knows about the namespace property:

```ts
import type { HttpClient } from '@kidd-cli/core/http'

declare module '@kidd-cli/core' {
  interface Context {
    readonly github: HttpClient
  }
}
```

Then use the client inside command handlers:

```ts
const repos = command({
  description: 'List repositories',
  async handler(ctx) {
    const response = await ctx.github.get<Repository[]>('/user/repos')
    ctx.logger.info(`Found ${String(response.data.length)} repos`)
  },
})
```

## HttpClient Methods

All methods accept a path (appended to `baseUrl`) and optional `RequestOptions`. Response and body types are parameterized via generics.

| Method   | Signature                                                                      |
| -------- | ------------------------------------------------------------------------------ |
| `get`    | `get<TResponse>(path, options?) => Promise<TypedResponse<TResponse>>`          |
| `post`   | `post<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>`  |
| `put`    | `put<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>`   |
| `patch`  | `patch<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>` |
| `delete` | `delete<TResponse>(path, options?) => Promise<TypedResponse<TResponse>>`       |

## TypedResponse

Every client method returns a `TypedResponse<TData>`:

| Field     | Type       | Description                     |
| --------- | ---------- | ------------------------------- |
| `data`    | `TData`    | Parsed JSON body                |
| `status`  | `number`   | HTTP status code                |
| `headers` | `Headers`  | Response headers                |
| `ok`      | `boolean`  | `true` when status is 200-299   |
| `raw`     | `Response` | The underlying `fetch` Response |

## RequestOptions

Per-request options passed to any client method:

| Field     | Type                     | Description                            |
| --------- | ------------------------ | -------------------------------------- |
| `body`    | `TBody`                  | JSON-serializable request body         |
| `headers` | `Record<string, string>` | Per-request headers (highest priority) |
| `params`  | `Record<string, string>` | URL query parameters                   |
| `signal`  | `AbortSignal`            | Abort signal for cancellation          |

Headers are merged in priority order: per-request > default > auth.

## Configuration

| Option             | Type                     | Default    | Description                                     |
| ------------------ | ------------------------ | ---------- | ----------------------------------------------- |
| `namespace`        | `string`                 | _required_ | Property name on `ctx` (e.g. `'github'`)        |
| `baseUrl`          | `string`                 | _required_ | Base URL for all requests                       |
| `authStoreKey`     | `string`                 | `'auth'`   | Store key to read auth credentials from         |
| `clearCredentials` | `boolean`                | `true`     | Remove credentials from the store after reading |
| `defaultHeaders`   | `Record<string, string>` | `{}`       | Default headers applied to every request        |

## Multiple Namespaces

Register multiple HTTP clients for different APIs by stacking middleware:

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      resolvers: [{ source: 'env', tokenVar: 'GITHUB_TOKEN' }],
      storeKey: 'github-auth',
    }),
    auth({
      resolvers: [{ source: 'env', tokenVar: 'GITLAB_TOKEN' }],
      storeKey: 'gitlab-auth',
    }),
    http({
      namespace: 'github',
      baseUrl: 'https://api.github.com',
      authStoreKey: 'github-auth',
    }),
    http({
      namespace: 'gitlab',
      baseUrl: 'https://gitlab.com/api/v4',
      authStoreKey: 'gitlab-auth',
    }),
  ],
  commands: { sync },
})
```

Augment the context for both namespaces:

```ts
import type { HttpClient } from '@kidd-cli/core/http'

declare module '@kidd-cli/core' {
  interface Context {
    readonly github: HttpClient
    readonly gitlab: HttpClient
  }
}
```

## Usage Without Auth

For public APIs that do not require authentication, use `http()` without the `auth()` middleware. No credentials are attached when the store key is empty:

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    http({
      namespace: 'api',
      baseUrl: 'https://api.publicdata.example.com',
    }),
  ],
  commands: { fetch },
})
```

## Standalone Client

Use `createHttpClient` outside the middleware pipeline for scripts or tests:

```ts
import { createHttpClient } from '@kidd-cli/core/http'

const client = createHttpClient({
  baseUrl: 'https://api.github.com',
  credential: { type: 'bearer', token: process.env['GITHUB_TOKEN'] },
  defaultHeaders: { Accept: 'application/vnd.github.v3+json' },
})

const response = await client.get<Repository[]>('/user/repos')
```
