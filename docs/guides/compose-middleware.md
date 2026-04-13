# Compose Middleware

Combine multiple middleware into a single reusable unit with merged type inference using `compose()`.

## Prerequisites

- An existing kidd CLI project
- `@kidd-cli/core` installed (`pnpm add @kidd-cli/core`)
- Two or more middleware that you want to bundle together

## Steps

### 1. Understand when to use compose

Use `compose()` when you have a group of middleware that always run together and you want to treat them as a single unit. This is common for middleware that depend on each other (e.g. `auth` + `http`, or `auth` + `requireAuth`).

| Scenario | Approach |
| --- | --- |
| Middleware always used together across commands | `compose()` into a single middleware |
| Middleware used independently in different commands | Inline middleware arrays |
| One middleware depends on another's context | `compose()` to enforce ordering |

### 2. Import compose and your middleware

```ts
import { compose } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'
```

### 3. Compose auth and http into a single middleware

Create a composed middleware that registers authentication and an HTTP client together. Order matters -- middleware execute left to right, so `auth` must come before `http` because the HTTP client reads from `ctx.auth.credential()`.

```ts
import { compose } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

const api = compose([
  auth({
    strategies: [
      auth.env({ tokenVar: 'MY_APP_TOKEN' }),
      auth.oauth({
        clientId: 'my-client-id',
        authUrl: 'https://example.com/authorize',
        tokenUrl: 'https://example.com/token',
      }),
    ],
  }),
  http({
    baseUrl: 'https://api.example.com',
    namespace: 'api',
  }),
])
```

### 4. Register the composed middleware

Pass the composed middleware to `cli()` as a single entry in the `middleware` array:

```ts
import { cli } from '@kidd-cli/core'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [api],
  commands: `${import.meta.dirname}/commands`,
})
```

This is equivalent to listing both middleware individually, but reduces duplication when the same combination is reused across multiple CLI entry points or command groups.

### 5. Use the composed context in commands

The composed middleware merges the context types from all input middleware. Downstream handlers see `ctx.auth` and `ctx.api` without additional type annotations:

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'List repositories',
  handler: async (ctx) => {
    const res = await ctx.api.get('/repos')
    ctx.log.success(`Found ${String(res.data.length)} repos`)
  },
})
```

### 6. Compose custom middleware with context decorations

When composing middleware that decorate the context, the type system infers the merged `Variables` from all inputs:

```ts
import { compose, middleware } from '@kidd-cli/core'
import { decorateContext } from '@kidd-cli/core/context'

interface UserEnv {
  readonly Variables: {
    readonly user: { readonly name: string; readonly email: string }
  }
}

interface TenantEnv {
  readonly Variables: {
    readonly tenant: { readonly id: string; readonly plan: string }
  }
}

const loadUser = middleware<UserEnv>(async (ctx, next) => {
  decorateContext(ctx, 'user', { name: 'Alice', email: 'alice@example.com' })
  await next()
})

const loadTenant = middleware<TenantEnv>(async (ctx, next) => {
  decorateContext(ctx, 'tenant', { id: 'acme', plan: 'enterprise' })
  await next()
})

const identity = compose([loadUser, loadTenant])
```

Handlers after `identity` see both `ctx.user` and `ctx.tenant` with full type inference.

### 7. Short-circuit behavior

Composed middleware short-circuits when any middleware in the chain does not call `next()`. If a middleware fails or returns early, subsequent middleware in the composed chain (and the downstream handler) are skipped:

```ts
const requireAuth = middleware((ctx, next) => {
  if (!ctx.auth.authenticated()) {
    return ctx.fail('Not authenticated. Run `my-app login` first.')
  }
  return next()
})

const secured = compose([
  auth({ strategies: [auth.env({ tokenVar: 'MY_APP_TOKEN' })] }),
  requireAuth,
  http({ baseUrl: 'https://api.example.com', namespace: 'api' }),
])
```

If `requireAuth` does not call `next()`, the `http` middleware never runs.

## Verification

```bash
# Type-check the project to confirm composed types merge correctly
pnpm typecheck

# Run a command that uses the composed middleware
npx my-app repos
```

## Troubleshooting

### Type error: Variables types are incompatible

**Issue:** TypeScript reports a type error when composing middleware with conflicting `Variables` keys.

**Fix:** Ensure no two middleware in the composed array declare the same key in their `Variables` with different types. If two middleware both declare `readonly user`, their types must be compatible (identical or one extending the other). Rename one of the keys to resolve the conflict.

### Middleware order causes runtime error

**Issue:** A middleware fails because it depends on context from a previous middleware that has not run yet.

**Fix:** `compose()` executes middleware in array order (index 0 runs first). Reorder the array so dependencies come before dependents. For example, `auth()` must precede `http()` because the HTTP client reads from `ctx.auth`.

### Composed middleware skips downstream handler

**Issue:** The command handler never executes after a composed middleware.

**Fix:** Ensure every middleware in the composed array calls `next()`. If any middleware returns without calling `next()`, the rest of the chain (including the handler) is skipped. Add logging before and after `next()` calls to identify which middleware is not forwarding.

## Resources

- [ts-pattern](https://github.com/gvergnaud/ts-pattern)

## References

- [Build a CLI](./build-a-cli.md)
- [Add Authentication](./add-authentication.md)
- [Lifecycle](/docs/concepts/lifecycle)
- [Context](/docs/concepts/context)
