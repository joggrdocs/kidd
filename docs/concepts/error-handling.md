# Error Handling

Kidd uses two complementary error strategies: Result tuples for library-level and internal operations, and `ContextError` for the CLI boundary. Result tuples keep error handling explicit and composable inside middleware, utilities, and domain logic. `ContextError` provides clean, user-facing output with exit codes at the CLI surface.

## Key Concepts

### Result Tuples

The primary error-handling mechanism for all operations that can fail in expected ways. A Result is a two-element tuple where the first element is the error (or `null`) and the second is the value (or `null`):

```ts
type Result<TValue, TError = Error> = readonly [TError, null] | readonly [null, TValue]
```

Destructure the tuple and check the error before accessing the value:

```ts
const [error, config] = await loadConfig()

if (error) {
  ctx.log.error(`Config failed: ${error.message}`)
  return
}

config.apiUrl // string -- safe to access
```

### Constructors

The `@kidd-cli/utils/fp` package exports `ok()` and `err()` constructors for building Result tuples:

```ts
import { ok, err } from '@kidd-cli/utils/fp'

function parseToken(raw: string): Result<string, Error> {
  if (raw.length === 0) {
    return err('Token cannot be empty')
  }
  return ok(raw.trim())
}
```

`ok()` wraps a success value as `[null, value]`. `err()` coerces any value to an `Error` and wraps it as `[Error, null]`. For domain-specific error types, use raw tuple literals instead of `err()`:

```ts
interface TokenError {
  readonly type: 'expired' | 'invalid' | 'missing'
  readonly message: string
}

function validateToken(token: string): Result<string, TokenError> {
  if (token.length === 0) {
    return [{ type: 'missing', message: 'No token provided' }, null]
  }
  return [null, token]
}
```

### Async Results

Use `ResultAsync<TValue, TError>` (an alias for `Promise<Result<TValue, TError>>`) for async operations. The `attemptAsync` utility wraps promise rejections into Result tuples:

```ts
import { attemptAsync } from '@kidd-cli/utils/fp'

const [error, data] = await attemptAsync(() => response.json())

if (error) {
  return [error, null]
}
```

### ContextError

A tagged `Error` subtype that carries an exit code and optional machine-readable error code. Created by `ctx.fail()` and caught by the CLI boundary to produce clean, user-facing output.

```ts
ctx.fail('Deployment failed')
ctx.fail('Invalid token', { code: 'AUTH_ERROR', exitCode: 2 })
```

| Property   | Type                  | Default | Description                 |
| ---------- | --------------------- | ------- | --------------------------- |
| `message`  | `string`              | --      | Human-readable error message |
| `code`     | `string \| undefined` | --      | Machine-readable error code |
| `exitCode` | `number`              | `1`     | Process exit code           |

`ctx.fail()` is typed as `never` -- it halts execution immediately. The CLI runner catches the thrown `ContextError`, prints the message without a stack trace, and exits with the specified code.

## When to Use Which Strategy

| Strategy       | Where                                      | Pattern                                |
| -------------- | ------------------------------------------ | -------------------------------------- |
| Result tuples  | Utilities, middleware internals, domain logic | `const [error, value] = doSomething()` |
| `ctx.fail()`   | Command handlers, middleware guards         | `ctx.fail('message')`                  |

Result tuples flow through internal layers where callers handle errors programmatically. `ctx.fail()` is the escape hatch at the CLI boundary where further recovery is not possible and the user needs a clean error message.

## Error Propagation Through Middleware

Middleware can propagate errors in two ways:

**Short-circuit with `ctx.fail()`** -- stops the middleware chain and surfaces the error to the user:

```ts
import { middleware } from '@kidd-cli/core'

const requireAuth = middleware((ctx, next) => {
  if (!ctx.auth.authenticated()) {
    return ctx.fail('Not authenticated. Run `my-app login` first.')
  }

  return next()
})
```

**Return a Result and let the handler decide** -- middleware performs work that may fail, stores the result, and the handler checks it:

```ts
const loadUser = middleware(async (ctx, next) => {
  const [error, user] = await fetchUser(ctx.auth.credential())

  if (error) {
    ctx.store.set('userError', error)
  } else {
    ctx.store.set('user', user)
  }

  return next()
})
```

## Chaining Results with Early Returns

Chain multiple Result-producing steps using early returns. Each step bails on the first error:

```ts
async function deployService(ctx: CommandContext): Promise<Result<Deployment, DeployError>> {
  const [configError, config] = await ctx.config.load()
  if (configError) return [configError, null]

  const [buildError, artifact] = await buildProject(config)
  if (buildError) return [buildError, null]

  const [uploadError, deployment] = await uploadArtifact(artifact)
  if (uploadError) return [uploadError, null]

  return [null, deployment]
}
```

## How Errors Surface to Users

The CLI runtime catches `ContextError` instances and handles them:

1. The error `message` is printed to stderr with styled formatting (no stack trace).
2. The process exits with `exitCode` (defaults to `1`).
3. If the error has a `code`, it can be used by callers for programmatic detection.

Unhandled exceptions (not `ContextError`) are caught by a top-level handler that prints a generic error message with the stack trace for debugging.

## Domain-Specific Error Types

Define domain error interfaces with a `type` discriminator for exhaustive handling:

```ts
interface AuthError {
  readonly type: 'no_credential' | 'save_failed' | 'validation_failed'
  readonly message: string
}

type AuthResult<T> = Result<T, AuthError>
```

Use `ts-pattern` `match` for exhaustive handling of error variants:

```ts
import { match } from 'ts-pattern'

const [error, credential] = await ctx.auth.login()

if (error) {
  match(error.type)
    .with('no_credential', () => {
      ctx.fail('No authentication method succeeded')
    })
    .with('save_failed', () => {
      ctx.fail('Failed to save credential to disk')
    })
    .with('validation_failed', () => {
      ctx.fail('Credential validation failed')
    })
    .exhaustive()
}
```

## Common Patterns

### Converting a Result to a ctx.fail() call

The typical pattern at the handler boundary is to check the error and call `ctx.fail()`:

```ts
export default command({
  description: 'Load and display config',
  handler: async (ctx) => {
    const result = await ctx.config.load()

    if (!result) {
      ctx.fail('Failed to load config')
    }

    ctx.log.info(`API URL: ${result.config.apiUrl}`)
  },
})
```

### Using exitOnError for guaranteed non-null

Some APIs support `exitOnError` to call `ctx.fail()` internally and guarantee a non-null return:

```ts
const { config } = await ctx.config.load({ exitOnError: true })
config.apiUrl // string -- guaranteed
```

### Auth login with Result handling

```ts
export default command({
  description: 'Log in',
  handler: async (ctx) => {
    const [error] = await ctx.auth.login()

    if (error) {
      ctx.fail(error.message)
    }

    ctx.log.success('Logged in')
  },
})
```

## References

- [Error Handling Standard](/contributing/standards/typescript/errors)
- [Context](./context.md)
- [Core Reference](/reference/packages/kidd)
- [Testing Your CLI](/guides/testing-your-cli)
