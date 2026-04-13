# HTTP

A typed HTTP client middleware for kidd CLIs. Provides a pre-configured client on `ctx[namespace]` with automatic base URL resolution, header injection, typed responses, and optional auth integration.

HTTP is a sub-export of the `@kidd-cli/core` package (`@kidd-cli/core/http`), not a separate package. It ships as middleware that decorates the context with a typed HTTP client keyed by the `namespace` option.

## Key Concepts

### Namespace-Based Context Decoration

Each `http()` middleware instance creates a client and attaches it to the context under the `namespace` you provide. With `namespace: 'api'`, the client is available as `ctx.api`. Multiple instances with different namespaces can coexist on the same context:

```ts
import { http } from '@kidd-cli/core/http'

middleware: [
  http({ baseUrl: 'https://api.example.com', namespace: 'api' }),
  http({ baseUrl: 'https://admin.example.com', namespace: 'admin' }),
]
```

Both `ctx.api` and `ctx.admin` are fully independent clients with their own base URL and headers.

### Header Resolution

The `headers` option accepts three forms:

| Form       | Example                                                          | Description                          |
| ---------- | ---------------------------------------------------------------- | ------------------------------------ |
| Static     | `{ 'X-Api-Key': 'abc123' }`                                     | Fixed headers applied to all requests |
| Function   | `(ctx) => ({ 'X-App-Name': ctx.meta.name })`                    | Resolved once when the middleware runs |
| `undefined` | _(omitted)_                                                     | No default headers                   |

Headers from `auth.headers()` use the function form -- they read `ctx.auth.credential()` and convert it to the appropriate header format. Per-request headers passed to individual client methods take highest priority.

### Typed Responses

Every client method returns a `TypedResponse<TData>` wrapper:

| Property  | Type       | Description                        |
| --------- | ---------- | ---------------------------------- |
| `data`    | `TData`    | Parsed JSON body                   |
| `status`  | `number`   | HTTP status code                   |
| `headers` | `Headers`  | Response headers                   |
| `ok`      | `boolean`  | `true` when status is 200-299      |
| `raw`     | `Response` | The underlying fetch `Response`    |

Provide a type parameter at the call site to type the response body:

```ts
interface Repo {
  readonly id: number
  readonly name: string
}

const res = await ctx.api.get<Repo[]>('/repos')
res.data // Repo[]
res.ok   // boolean
```

JSON parsing is fault-tolerant -- when the response body is not valid JSON, `data` resolves to `null` rather than crashing the command.

## Standalone Usage

The `http()` middleware does not require the auth middleware. Use it standalone for public APIs or when providing headers explicitly.

```ts
import { cli } from '@kidd-cli/core'
import { http } from '@kidd-cli/core/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    http({
      baseUrl: 'https://api.example.com',
      namespace: 'api',
    }),
  ],
  commands: `${import.meta.dirname}/commands`,
})
```

Static headers:

```ts
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: { 'X-Api-Key': 'abc123' },
})
```

Dynamic headers resolved from context:

```ts
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: (ctx) => ({
    'X-App-Name': ctx.meta.name,
  }),
})
```

## Usage with Auth

When paired with the auth middleware, `auth.headers()` provides automatic credential injection. Place `auth()` before `http()` in the middleware array so that `ctx.auth` is available when headers resolve.

```ts
import { cli } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      strategies: [auth.env(), auth.token()],
    }),
    http({
      baseUrl: 'https://api.example.com',
      namespace: 'api',
      headers: auth.headers(),
    }),
  ],
  commands: `${import.meta.dirname}/commands`,
})
```

`auth.headers()` returns a function that reads `ctx.auth.credential()` and converts it into the correct HTTP header format based on the credential type (Bearer, Basic, API key, or custom). It returns an empty record when no auth middleware is present or no credential exists.

## HttpClient Methods

The client exposes five methods, each with method-level generics for response and body types:

| Method   | Signature                                                        |
| -------- | ---------------------------------------------------------------- |
| `get`    | `<TResponse>(path, options?) => Promise<TypedResponse<TResponse>>` |
| `post`   | `<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>` |
| `put`    | `<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>` |
| `patch`  | `<TResponse, TBody>(path, options?) => Promise<TypedResponse<TResponse>>` |
| `delete` | `<TResponse>(path, options?) => Promise<TypedResponse<TResponse>>` |

### RequestOptions

Per-request options passed to any client method:

| Field     | Type                          | Description               |
| --------- | ----------------------------- | ------------------------- |
| `body`    | `TBody`                       | JSON-serialized body      |
| `headers` | `Record<string, string>`      | Per-request headers (highest priority) |
| `params`  | `Record<string, string>`      | URL query parameters      |
| `signal`  | `AbortSignal`                 | Abort signal for cancellation |

## Error Handling

The HTTP client does not use Result tuples internally -- it returns `TypedResponse<TData>` directly. Check the `ok` property to determine success or failure, then use `ctx.fail()` to surface errors to the user:

```ts
export default command({
  description: 'List repositories',
  handler: async (ctx) => {
    const res = await ctx.api.get<Repo[]>('/repos')

    if (!res.ok) {
      ctx.fail(`API request failed with status ${String(res.status)}`)
    }

    ctx.log.success(`Found ${String(res.data.length)} repos`)
  },
})
```

For requests where the error body carries structured information, type both the success and error paths:

```ts
interface ApiError {
  readonly message: string
  readonly code: string
}

const res = await ctx.api.post<Repo, CreateRepoBody>('/repos', {
  body: { name: 'new-repo', private: true },
})

if (!res.ok) {
  const error = res.data as unknown as ApiError
  ctx.fail(`${error.code}: ${error.message}`)
}
```

## Full Example

A command handler that makes an authenticated API call with a spinner:

```ts
import { command } from '@kidd-cli/core'

interface Deployment {
  readonly id: string
  readonly status: string
  readonly url: string
}

export default command({
  description: 'Deploy the application',
  handler: async (ctx) => {
    ctx.status.spinner.start('Deploying...')

    const res = await ctx.api.post<Deployment>('/deployments', {
      body: { branch: 'main' },
    })

    if (!res.ok) {
      ctx.status.spinner.error('Deployment failed')
      ctx.fail(`API returned ${String(res.status)}`)
    }

    ctx.status.spinner.stop(`Deployed to ${res.data.url}`)
  },
})
```

## References

- [Authentication](./authentication.md)
- [Context](./context.md)
- [Core Reference](/reference/packages/kidd)
- [Add Authentication Guide](/guides/add-authentication)
