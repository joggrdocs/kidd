# Middleware API Redesign

## Proposed API

### Design Principles

1. **Separate passive from interactive** -- passive credential lookup (env, file) runs automatically on every command. Interactive login flows (OAuth, prompt) run explicitly in a handler. These are different operations at different times.
2. **Unbundle auth from HTTP** -- auth resolves credentials. HTTP makes requests. Wiring is explicit via `auth.headers()`, not hidden.
3. **Built-in enforcement** -- `auth.require()` ships as a first-class primitive, not a pattern users copy from docs.
4. **Explicit wiring over magic** -- `http()` doesn't silently read `ctx.auth`. The user explicitly passes `auth.headers()` to the `headers` option. One visible line, no hidden behavior.
5. **Compose for convenience** -- a `compose()` utility bundles middleware into reusable units with encoded ordering.
6. **Typed middleware** -- middleware declares what context variables it provides via generics. Handlers get type-safe access without global module augmentation.

### Overview

```
auth()              Credential resolution. Decorates ctx.auth.
auth.require()      Gate. Fails if no credential.
auth.headers()      Returns a header-resolver function for use with http().
http()              HTTP client. No auth awareness -- headers are explicit.
compose()           Bundles middleware into a single reusable unit.
middleware<E>()     Typed middleware factory (declares provided context variables).
```

### Basic Setup

```ts
import { cli } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      strategies: [
        auth.env(),
        auth.file(),
        auth.oauth({ clientId: '...', authUrl: '...', tokenUrl: '...' }),
        auth.token(),
      ],
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

- `auth()` handles passive strategies (env, file) automatically on every command. Interactive strategies (oauth, token) are registered but only run on `ctx.auth.login()`.
- `http()` knows nothing about auth. `auth.headers()` returns a `(ctx) => Record<string, string>` function that reads `ctx.auth.credential()` and builds the appropriate `Authorization` header. Wiring is explicit -- one visible line.

### Login Command

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Authenticate with the service',
  handler: async (ctx) => {
    // Default: walks interactive strategies from config
    const [error] = await ctx.auth.login()

    if (error) return ctx.fail(error.message)
    ctx.logger.success('Logged in')
  },
})
```

Override with specific strategies when needed:

```ts
// login.ts -- browser only
await ctx.auth.login({ strategies: [auth.oauth({ ... })] })

// login-headless.ts -- CI/SSH only
await ctx.auth.login({ strategies: [auth.deviceCode({ ... }), auth.token()] })
```

If `strategies` is provided, it overrides the config. If omitted, it uses the interactive strategies from the root `auth()` config. The common case requires no arguments.

### Requiring Auth

```ts
import { command } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'

export default command({
  middleware: [auth.require()],
  handler: async (ctx) => {
    const res = await ctx.api.get('/me')
    ctx.output.write(res.data, { json: true })
  },
})

// Custom message
auth.require({ message: 'Run `my-app login` first.' })
```

### Composing Middleware

```ts
import { compose } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

const api = compose(
  auth({
    strategies: [auth.env(), auth.file(), auth.oauth({ ... }), auth.token()],
  }),
  auth.require(),
  http({
    baseUrl: 'https://api.example.com',
    namespace: 'api',
    headers: auth.headers(),
  }),
)

cli({
  middleware: [api],
  commands: `${import.meta.dirname}/commands`,
})
```

### Typed Middleware

Middleware declares what context variables it provides via a generic. Handlers get type-safe access when the middleware is in their chain -- no global module augmentation needed.

The runtime mechanism is `decorateContext` -- it adds a frozen, non-writable property to the context object. The generic parameter carries the type information so TypeScript can infer the handler's `ctx` type.

```ts
import { command, decorateContext, middleware } from '@kidd-cli/core'

interface User {
  readonly id: string
  readonly role: 'admin' | 'user'
}

const loadUser = middleware<{ Variables: { user: User } }>(async (ctx, next) => {
  decorateContext(ctx, 'user', await fetchUser(ctx.auth.credential()))
  await next()
})

export default command({
  middleware: [loadUser],
  handler: async (ctx) => {
    ctx.user        // User -- type-safe, scoped to this command
    ctx.user.role   // 'admin' | 'user'
  },
})
```

When multiple typed middleware are applied, their variables intersect:

```ts
const withUser = middleware<{ Variables: { user: User } }>(...)
const withOrg = middleware<{ Variables: { org: Organization } }>(...)

command({
  middleware: [withUser, withOrg],
  handler: async (ctx) => {
    ctx.user   // User
    ctx.org    // Organization
  },
})
```

Variables go directly on `ctx` -- same namespace as `ctx.auth`. There is no separate `ctx.var` accessor. The generic parameter on `middleware<E>()` is the source of truth for what the middleware provides. Module augmentation remains available for global context properties (like `ctx.auth`), but per-command type safety via generics is the primary mechanism.

### AuthContext

```ts
interface AuthContext {
  /** Read the current credential from passive sources (file, env). */
  readonly credential: () => AuthCredential | null

  /** Check whether a passive credential exists. */
  readonly authenticated: () => boolean

  /** Run interactive strategies, persist the result. */
  readonly login: (options?: {
    readonly strategies?: readonly ResolverConfig[]
  }) => AsyncResult<AuthCredential, AuthError>

  /** Remove stored credential from disk. */
  readonly logout: () => AsyncResult<string, AuthError>
}
```

`login()` without arguments walks the interactive strategies from the root `auth()` config. With `{ strategies }`, it overrides with the provided list.

### How `auth.headers()` Works

A factory that returns a header-resolver function. Reads `ctx.auth.credential()` and returns the appropriate header (`Authorization: Bearer ...`, `Authorization: Basic ...`, etc.):

```ts
auth.headers = () => {
  return (ctx) => {
    if (!('auth' in ctx)) return {}
    const credential = ctx.auth.credential()
    if (credential === null) return {}
    return buildAuthHeaders(credential)
  }
}
```

Composes with static headers:

```ts
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: (ctx) => ({
    ...auth.headers()(ctx),
    'X-App-Version': '1.0.0',
  }),
})
```

### How `compose()` Works

```ts
function compose(...middlewares: readonly Middleware[]): Middleware {
  return middleware(async (ctx, next) => {
    const chain = middlewares.reduceRight(
      (nextFn, mw) => () => mw.handler(ctx, nextFn),
      next,
    )
    await chain()
  })
}
```

---

## Migration from Current API

```ts
// Before
auth({
  resolvers: [
    auth.env(),
    auth.file(),
    auth.oauth({ clientId: '...', authUrl: '...', tokenUrl: '...' }),
    auth.token(),
  ],
  http: { baseUrl: 'https://api.example.com', namespace: 'api' },
})

// After -- root middleware
auth({
  strategies: [
    auth.env(),
    auth.file(),
    auth.oauth({ clientId: '...', authUrl: '...', tokenUrl: '...' }),
    auth.token(),
  ],
}),
http({
  baseUrl: 'https://api.example.com',
  namespace: 'api',
  headers: auth.headers(),
}),

// After -- login command (no change for simple case)
await ctx.auth.login()
```

| Concern | Current | Proposed |
| ------- | ------- | -------- |
| Passive resolution | `auth({ resolvers: [env, file, ...interactive] })` | `auth({ strategies: [env, file, ...interactive] })` |
| Interactive login | `ctx.auth.login()` walks global resolvers | `ctx.auth.login()` (same), or override with `{ strategies }` |
| Auth enforcement | User writes custom middleware | `auth.require()` built-in |
| HTTP + auth wiring | `auth({ http: { ... } })` bundled, implicit | `http({ headers: auth.headers() })` explicit |
| Targeted strategy | Not possible | `ctx.auth.login({ strategies: [auth.token()] })` |
| Bundle middleware | Not possible | `compose(mw1, mw2, mw3)` |
| Context type safety | Global module augmentation | `middleware<{ Variables: { ... } }>()` per-middleware |

---

## Build Readiness

| Component | Status | Notes |
| --------- | ------ | ----- |
| `http()` with explicit `headers` | **Ready to build** | Add `auth: false` default, remove `ctx.auth` magic. Already supports `headers: (ctx) => ...`. |
| `auth.headers()` | **Ready to build** | Small factory function. Uses existing `buildAuthHeaders()`. |
| `auth.require()` | **Ready to build** | Already documented as a pattern. Move into the `auth` namespace. |
| `compose()` | **Ready to build** | ~10 lines. `reduceRight` over middleware handlers. |
| `login({ strategies })` | Design finalized | Optional override. Requires refactoring `runStrategyChain` to accept filtered list. |
| `resolvers` → `strategies` rename | Design finalized | Non-breaking if old key is kept as alias during migration. |
| Remove `auth({ http })` option | Design finalized | Deprecate, then remove. Replaced by standalone `http()` + `auth.headers()`. |
| Typed middleware (`middleware<E>()`) | **Ready to build** | Pure type-level change. Uses `decorateContext` for runtime, generics + `InferVariables` for type inference. No `ctx.set()`/`ctx.var`. |

---

## Why Not Fully Separate Middleware Per Strategy?

Hono and Fastify make each auth type (bearer, JWT, basic) a separate middleware because web servers validate credentials on every request. Each middleware does the same job -- check the incoming request -- just with different formats.

CLIs are different. The auth lifecycle is:

1. **Passive check** -- is there a saved credential? (runs every command)
2. **Interactive login** -- acquire a credential (runs once, explicitly)
3. **Persist** -- save to disk for future commands
4. **Enforce** -- block unauthenticated commands
5. **Inject** -- attach credential to HTTP requests

After login, every command reads the same `~/.my-app/auth.json` file. The strategy that produced the credential doesn't matter. Making `auth.oauth()` and `auth.token()` separate middleware would force each to independently handle coordination (who won?), persistence (who saves?), and context decoration (who owns `ctx.auth`?). You'd re-invent the coordinator inside each one.

The right decomposition for CLIs is along the **passive vs interactive boundary**, not one middleware per strategy. Passive resolution is middleware (runs automatically, every command). Interactive login is a handler operation (runs explicitly, once). Enforcement is middleware (gate before handler). HTTP is middleware (client creation). Each does one job.

---

## Current API Reference

### Middleware

```ts
// Definition
const timing = middleware(async (ctx, next) => { await next() })

// Registration: root (all commands) or command-level
cli({ middleware: [timing] })
command({ middleware: [timing], handler: async (ctx) => { ... } })
```

Signature: `(ctx: Context, next: NextFunction) => Promise<void> | void`

Onion model -- root wraps command, command wraps handler. Short-circuit by not calling `next()`.

### Context Extension

```ts
decorateContext(ctx, 'api', httpClient)

declare module '@kidd-cli/core' {
  interface Context { readonly api: HttpClient }
}
```

Module augmentation is global -- types leak to all handlers regardless of middleware presence.

### Auth

```ts
auth({
  resolvers: [auth.env(), auth.file(), auth.oauth({ ... }), auth.token()],
  http: { baseUrl: '...', namespace: 'api' },
})
```

Passive resolvers run on init. Interactive resolvers run on `ctx.auth.login()`. `http` option bundles HTTP client creation. No way to target a specific resolver.

---

## Prior Art

### Hono

`(c, next)` with `await next()` onion model. Each auth type is a separate middleware.

```ts
bearerAuth({ token: 'secret' })                              // pure gate, no decoration
bearerAuth({ verifyToken: async (token, c) => { ... } })     // custom verify + opt-in decoration
basicAuth({ verifyUser: async (u, p, c) => true })           // pure gate
jwt({ secret: '...', alg: 'HS256' })                         // auto-decorates c.var.jwtPayload
```

**Typed middleware** via `createMiddleware<{ Variables: { ... } }>()`. When multiple typed middleware are applied to a route, Hono intersects their `Variables` types via `IntersectNonAnyTypes`. Each handler only sees variables from middleware in its chain. `createFactory<Env>()` captures the environment type once so middleware and handlers don't repeat it. Both the generic approach and `ContextVariableMap` global augmentation work simultaneously -- the generic is precise (per-route), the augmentation is convenient (global).

### Fastify

Lifecycle hooks, not middleware chain. Auth uses separate focused plugins composed via `@fastify/auth`:

```ts
fastify.auth([fastify.verifyJWT, fastify.verifyApiKey], { relation: 'or' })   // OR composition
fastify.auth([fastify.verifyJWT, fastify.verifyAdmin], { relation: 'and' })   // AND composition
```

Each plugin (`@fastify/bearer-auth`, `@fastify/basic-auth`, `@fastify/jwt`, `@fastify/oauth2`) decorates the instance with a verification function. Request decoration is each strategy's responsibility. `@fastify/jwt` supports namespaces for multiple configs (`request.accessVerify()` vs `request.refreshVerify()`). Context typing uses module augmentation (global).

### Koa

`(ctx, next)` with `await next()`. Onion model originated here. `koa-compose` bundles middleware into a single unit. Context extension via `ctx.state` mutation.

### Express

`(req, res, next)` -- no upstream phase. Context extension via `req` mutation + global module augmentation. Auth via `passport.js` (strategy pattern).

### Effect

`Layer<Out, Err, In>` -- declarative dependency graph. Full compile-time tracking of requirements via the type system. Composition via `Layer.provide` / `Layer.merge`. The gold standard for type safety.
