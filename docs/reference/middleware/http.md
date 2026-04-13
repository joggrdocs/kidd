# http()

Create an HTTP client middleware that decorates the context with a typed client.

Import from `@kidd-cli/core/http`.

```ts
import { http } from '@kidd-cli/core/http'

cli({
  middleware: [
    http({
      namespace: 'api',
      baseUrl: 'https://api.example.com',
      headers: (ctx) => ({
        Authorization: `Bearer ${ctx.store.get('token')}`,
      }),
    }),
  ],
})
```

## HttpOptions

| Field       | Type                                                                     | Default | Description                                                        |
| ----------- | ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------ |
| `namespace` | `string`                                                                 | --      | Context key where the client is attached (e.g. `'api'`)            |
| `baseUrl`   | `string`                                                                 | --      | Base URL prepended to all request paths                            |
| `headers`   | `Record<string, string> \| (ctx: CommandContext) => Record \| Promise`   | --      | Static headers or a sync/async resolver called with the context    |

The `headers` option supports three forms:

| Form                     | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `undefined`              | No extra headers                                             |
| `Record<string, string>` | Static headers applied to every request                      |
| `(ctx) => Record`        | Function called per-request with the command context (can be async) |

## HttpClient

The client attached to `ctx[namespace]`. All methods return `Promise<TypedResponse<TResponse>>`.

| Method   | Signature                                                                    | Description         |
| -------- | ---------------------------------------------------------------------------- | ------------------- |
| `get`    | `<TResponse>(path: string, options?: RequestOptions) => Promise<TypedResponse<TResponse>>`             | GET request         |
| `post`   | `<TResponse, TBody>(path: string, options?: RequestOptions<TBody>) => Promise<TypedResponse<TResponse>>` | POST request        |
| `put`    | `<TResponse, TBody>(path: string, options?: RequestOptions<TBody>) => Promise<TypedResponse<TResponse>>` | PUT request         |
| `patch`  | `<TResponse, TBody>(path: string, options?: RequestOptions<TBody>) => Promise<TypedResponse<TResponse>>` | PATCH request       |
| `delete` | `<TResponse>(path: string, options?: RequestOptions) => Promise<TypedResponse<TResponse>>`             | DELETE request      |

## RequestOptions

Per-request options passed to any client method.

| Field    | Type                          | Default | Description                      |
| -------- | ----------------------------- | ------- | -------------------------------- |
| `body`   | `TBody`                       | --      | JSON-serialized request body     |
| `headers`| `Record<string, string>`      | --      | Per-request headers (highest priority) |
| `params` | `Record<string, string>`      | --      | URL query parameters             |
| `signal` | `AbortSignal`                 | --      | Abort signal for cancellation    |

## TypedResponse

Wrapper returned by all client methods.

| Field     | Type       | Description                        |
| --------- | ---------- | ---------------------------------- |
| `data`    | `TData`    | Parsed JSON body (null on failure) |
| `status`  | `number`   | HTTP status code                   |
| `headers` | `Headers`  | Response headers                   |
| `ok`      | `boolean`  | True when status is 200-299        |
| `raw`     | `Response` | Raw fetch Response                 |

## Header priority

When headers come from multiple sources, they merge with this priority (highest wins):

1. Per-request `options.headers`
2. Dynamic headers from `resolveHeaders`
3. Default headers from middleware `headers` option

## createHttpClient()

Standalone factory for creating an `HttpClient` outside of middleware.

```ts
import { createHttpClient } from '@kidd-cli/core/http'

const client = createHttpClient({
  baseUrl: 'https://api.example.com',
  defaultHeaders: { 'X-Api-Key': 'my-key' },
})

const response = await client.get<{ name: string }>('/users/1')
```

| Field             | Type                          | Default | Description                                |
| ----------------- | ----------------------------- | ------- | ------------------------------------------ |
| `baseUrl`         | `string`                      | --      | Base URL for all requests                  |
| `defaultHeaders`  | `Record<string, string>`      | --      | Static headers applied to every request    |
| `resolveHeaders`  | `() => Record<string, string>`| --      | Dynamic header resolver called per-request |

## Usage in a command handler

```ts
import { command } from '@kidd-cli/core'
import { http } from '@kidd-cli/core/http'

interface User {
  readonly id: string
  readonly name: string
}

export default command({
  description: 'Fetch user profile',
  middleware: [
    http({
      namespace: 'api',
      baseUrl: 'https://api.example.com',
      headers: (ctx) => ({
        Authorization: `Bearer ${ctx.store.get('token')}`,
      }),
    }),
  ],
  async handler(ctx) {
    const response = await ctx.api.get<User>('/me')

    if (response.ok) {
      ctx.log.success(`Hello, ${response.data.name}`)
    }
  },
})
```

## Types

Exported from `@kidd-cli/core/http`:

| Type            | Description                                     |
| --------------- | ----------------------------------------------- |
| `HttpClient`    | Typed HTTP client interface                     |
| `HttpOptions`   | Options for the `http()` middleware factory      |
| `RequestOptions`| Per-request options (body, headers, params, signal) |
| `TypedResponse` | Response wrapper with typed data                |

## References

- [Authentication](/docs/concepts/authentication)
- [Authentication Reference](./authentication)
- [middleware()](../framework/middleware)
- [cli()](../framework/bootstrap)
