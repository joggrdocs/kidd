# compose()

Combine multiple middleware into a single middleware. Executes each middleware in order, threading `next()` through the chain, and merges all `Variables` types so downstream handlers see the combined context.

Import from `@kidd-cli/core`.

```ts
import { compose } from '@kidd-cli/core'
```

## Signature

```ts
function compose<const TMiddleware extends readonly Middleware<MiddlewareEnv>[]>(
  middlewares: TMiddleware
): Middleware<ComposedEnv<TMiddleware>>
```

| Parameter     | Type                             | Description                           |
| ------------- | -------------------------------- | ------------------------------------- |
| `middlewares` | `readonly Middleware[]`          | Ordered tuple of middleware to compose |

Returns a single `Middleware` whose `Variables` is the intersection of all input middleware `Variables`.

## Execution order

Middleware execute in array order. Each middleware must call `next()` to continue the chain. If a middleware does not call `next()`, the remaining middleware and the downstream handler are skipped.

```ts
const composed = compose([first, second, third])
// Execution: first → second → third → downstream handler
```

## Type inference

The returned middleware merges `Variables` from all input middleware. Downstream handlers see the combined context without manual type assertions.

```ts
import { compose } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'

const stack = compose([
  auth({ strategies: [auth.env()] }),
  http({ namespace: 'api', baseUrl: 'https://api.example.com' }),
])

export default command({
  middleware: [stack],
  handler(ctx) {
    // ctx.auth and ctx.api are both typed
  },
})
```

## Short-circuit behavior

When a middleware in the chain does not call `next()`, the chain stops. Neither the remaining composed middleware nor the downstream `next()` are called.

```ts
const guard = middleware((ctx, next) => {
  if (!ctx.store.has('token')) {
    ctx.log.error('Not authenticated')
    return
  }
  return next()
})

const composed = compose([guard, http({ namespace: 'api', baseUrl: '...' })])
// If guard does not call next(), http middleware never runs
```

## Context propagation

Context decorations from earlier middleware in the chain are visible to later middleware. The underlying context object is shared across the entire chain.

## Edge cases

| Scenario                  | Behavior                                      |
| ------------------------- | --------------------------------------------- |
| Empty array               | Calls downstream `next()` immediately         |
| Single middleware          | Equivalent to using that middleware directly  |
| Undefined entry in array  | Skips remaining middleware, calls `next()`    |
| Async middleware           | Fully supported, `await next()` works correctly |

## References

- [middleware()](./middleware)
- [command()](./command)
- [cli()](./bootstrap)
