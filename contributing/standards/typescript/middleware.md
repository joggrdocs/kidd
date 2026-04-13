# Middleware

## Overview

Standards for implementing middleware in `@kidd-cli/core`. Middleware decorates the command context with additional properties (auth, config, HTTP clients, etc.) using a factory function pattern. These rules ensure middleware is composable, type-safe, and testable. All built-in middleware lives in `packages/core/src/middleware/`.

## Rules

### Use the Factory Function Pattern

Every middleware is a factory function that accepts an options parameter and returns a `Middleware<TEnv>`. The factory calls `middleware()` from `@/middleware.js` with a handler that decorates the context and calls `next()`.

#### Correct

```ts
import { decorateContext } from '@/context/decorate.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type { TimingEnv, TimingOptions } from './types.js'

export function timing(options?: TimingOptions): Middleware<TimingEnv> {
  return middleware<TimingEnv>((ctx, next) => {
    decorateContext(ctx, 'timing', createTimingCtx(options))
    return next()
  })
}
```

#### Incorrect

```ts
export const timingMiddleware = {
  handler(ctx: CommandContext, next: () => Promise<void>) {
    ctx.timing = { start: Date.now() }
    return next()
  },
}
```

### Declare an Env Interface for Type Safety

Every middleware that adds properties to the context must declare a `TEnv` interface with a `Variables` record. This enables TypeScript to infer the decorated properties in downstream handlers.

#### Correct

```ts
export interface TimingEnv {
  readonly Variables: {
    readonly timing: TimingContext
  }
}

export function timing(): Middleware<TimingEnv> {
  return middleware<TimingEnv>((ctx, next) => {
    decorateContext(ctx, 'timing', value)
    return next()
  })
}
```

#### Incorrect

```ts
export function timing(): Middleware {
  return middleware((ctx, next) => {
    decorateContext(ctx, 'timing', value)
    return next()
  })
}
```

### Use decorateContext for All Context Properties

Always use `decorateContext(ctx, key, value)` from `@/context/decorate.js` to add properties. Never assign directly to the context object. `decorateContext` defines the property as non-writable and non-configurable.

#### Correct

```ts
decorateContext(ctx, 'figures', resolved)
```

#### Incorrect

```ts
;(ctx as Record<string, unknown>).figures = resolved
```

### Add Module Augmentation in types.ts

Augment `CommandContext` via `declare module '@kidd-cli/core'` so that consumers get typed access to `ctx.<property>` after importing the middleware subpath.

#### Correct

```ts
declare module '@kidd-cli/core' {
  interface CommandContext {
    readonly timing: TimingContext
  }
}
```

#### Incorrect

```ts
// No augmentation -- consumers must cast ctx manually
const timingCtx = (ctx as Record<string, unknown>).timing as TimingContext
```

### Mark All Options and Context Properties Readonly

Options interfaces and context types must use `readonly` on every property. This prevents accidental mutation of middleware configuration and decorated values.

#### Correct

```ts
export interface TimingOptions {
  readonly precision?: 'ms' | 'us'
}

export type TimingContext = Readonly<{
  start: number
  elapsed: () => number
}>
```

#### Incorrect

```ts
export interface TimingOptions {
  precision?: 'ms' | 'us'
}

export interface TimingContext {
  start: number
  elapsed: () => number
}
```

### Resolve Options with Explicit Undefined Checks

When resolving optional configuration, use explicit `=== undefined` checks in private helper functions. Do not use optional chaining or nullish coalescing.

#### Correct

```ts
function resolveFigures(options: FiguresOptions | undefined): Record<string, string> {
  if (options === undefined) {
    return defaultFigures
  }

  if (options.figures !== undefined) {
    return options.figures
  }

  return defaultFigures
}
```

#### Incorrect

```ts
function resolveFigures(options?: FiguresOptions): Record<string, string> {
  return options?.figures ?? defaultFigures
}
```

### Follow the Standard File Structure

Each middleware directory contains exactly three files plus a test file:

| File             | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `index.ts`       | Barrel re-exports (factory, types)                     |
| `<name>.ts`      | Factory function and private helpers                   |
| `types.ts`       | Options, Env, Context types, and module augmentation   |
| `<name>.test.ts` | Tests for the factory, decoration, and option handling |

### Name Middleware Consistently

- Factory function: noun describing the capability (`figures`, `auth`, `config`, `http`, `report`)
- Options type: `<Name>Options` (`FiguresOptions`, `AuthOptions`)
- Context type: `<Name>Context` (`FiguresContext`, `AuthContext`)
- Env type: `<Name>Env` (`FiguresEnv`, `ReportEnv`)
- Factory type: `<Name>Factory` (`FiguresFactory`, `IconsFactory`)

### Always Call and Return next()

The middleware handler must call `next()` and return its result to continue the chain. Failing to call `next()` halts all downstream middleware and the command handler.

#### Correct

```ts
return middleware<TimingEnv>((ctx, next) => {
  decorateContext(ctx, 'timing', value)
  return next()
})
```

#### Incorrect

```ts
return middleware<TimingEnv>((ctx, next) => {
  decorateContext(ctx, 'timing', value)
})
```

### Test the Factory, Decoration, Options, and next()

Every middleware test file must cover:

1. The factory returns a `Middleware` tagged object
2. The factory decorates the context with the expected property
3. Custom options override default values
4. The handler calls `next()` exactly once

#### Correct

```ts
describe('timing()', () => {
  it('should return a Middleware tagged object', () => {
    const mw = timing()
    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should decorate ctx.timing', async () => {
    const ctx = createMockCtx()
    const next = vi.fn()
    await mw.handler(ctx as never, next)

    const result = (ctx as Record<string, unknown>)['timing']
    expect(result).toBeDefined()
  })

  it('should call next after decorating', async () => {
    const ctx = createMockCtx()
    const next = vi.fn()
    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
```

## References

- [Design Patterns](./design-patterns.md)
- [Coding Style](./coding-style.md)
- [Creating Middleware Guide](../../guides/creating-middleware.md)
