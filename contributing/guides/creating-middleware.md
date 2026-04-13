# Create a Middleware

Add a new built-in middleware to `@kidd-cli/core` end-to-end: implementation, types, exports, and tests.

## Prerequisites

- Familiarity with the [architecture](../concepts/architecture.md) and [middleware standard](../standards/typescript/middleware.md)
- The project builds successfully (`pnpm typecheck`)

## Steps

### 1. Create the middleware directory

Create a new directory under `packages/core/src/middleware/` with three files:

```
packages/core/src/middleware/<name>/
  index.ts       # Re-exports public API
  <name>.ts      # Factory function and middleware logic
  types.ts       # Options, Env, Context types, and module augmentation
```

### 2. Define types

Define the context type, options interface, env descriptor, and module augmentation in `types.ts`.

```ts
import type { Middleware } from '@/types/index.js'

export type TimingContext = Readonly<{
  start: number
  elapsed: () => number
}>

export interface TimingOptions {
  readonly precision?: 'ms' | 'us'
}

export interface TimingEnv {
  readonly Variables: {
    readonly timing: TimingContext
  }
}

export type TimingFactory = (options?: TimingOptions) => Middleware

declare module '@kidd-cli/core' {
  interface CommandContext {
    readonly timing: TimingContext
  }
}
```

Key patterns:

- Context type is `Readonly<>` (immutable public surface)
- Options interface has all properties marked `readonly`
- `Env` interface declares a `Variables` record matching the context key
- Module augmentation merges the property onto `CommandContext`

### 3. Implement the factory

Create the middleware factory in `<name>.ts`. Import `middleware` from `@/middleware.js` and `decorateContext` from `@/context/decorate.js`.

```ts
import { decorateContext } from '@/context/decorate.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import type { TimingContext, TimingEnv, TimingOptions } from './types.js'

export function timing(options?: TimingOptions): Middleware<TimingEnv> {
  return middleware<TimingEnv>((ctx, next) => {
    const start = performance.now()
    const timingCtx: TimingContext = Object.freeze({
      start,
      elapsed: () => performance.now() - start,
    })

    decorateContext(ctx, 'timing', timingCtx)

    return next()
  })
}
```

Rules:

- The factory returns `Middleware<TEnv>` with the env generic
- Call `decorateContext(ctx, key, value)` to attach the property
- Call `next()` and return its result to continue the middleware chain
- Resolve options with explicit `undefined` checks (no optional chaining)

### 4. Create the barrel export

Re-export the public API from `index.ts`:

```ts
export { timing } from './timing.js'
export type { TimingContext, TimingEnv, TimingFactory, TimingOptions } from './types.js'
```

### 5. Add to package.json exports

Add an entry to `packages/core/package.json` under `exports`:

```json
"./timing": {
  "types": "./dist/middleware/timing.d.ts",
  "default": "./dist/middleware/timing.js"
}
```

### 6. Add to tsdown config

Add an entry to `packages/core/tsdown.config.ts`:

```ts
entry: {
  'middleware/timing': 'src/middleware/timing/index.ts',
}
```

### 7. Write tests

Create a colocated test file at `packages/core/src/middleware/<name>/<name>.test.ts`. Test the factory return value, context decoration, option handling, and `next()` invocation.

```ts
import { hasTag } from '@kidd-cli/utils/tag'
import { describe, expect, it, vi } from 'vitest'

import { timing } from './timing.js'

function createMockCtx() {
  const store = new Map()

  return {
    args: {},
    config: {},
    fail: vi.fn((): never => {
      throw new Error('fail')
    }),
    colors: {},
    format: { json: vi.fn(), table: vi.fn() },
    log: {
      error: vi.fn(),
      info: vi.fn(),
      intro: vi.fn(),
      message: vi.fn(),
      newline: vi.fn(),
      note: vi.fn(),
      outro: vi.fn(),
      raw: vi.fn(),
      step: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
    },
    meta: {
      command: ['test'],
      dirs: { global: '.test-cli', local: '.test-cli' },
      name: 'test-cli',
      version: '1.0.0',
    },
    prompts: {
      confirm: vi.fn(),
      multiselect: vi.fn(),
      password: vi.fn(),
      select: vi.fn(),
      text: vi.fn(),
    },
    spinner: { message: vi.fn(), start: vi.fn(), stop: vi.fn() },
    store: {
      clear: () => store.clear(),
      delete: (key: string) => store.delete(key),
      get: (key: string) => store.get(key),
      has: (key: string) => store.has(key),
      set: (key: string, value: unknown) => store.set(key, value),
    },
  }
}

describe('timing()', () => {
  it('should return a Middleware tagged object', () => {
    const mw = timing()
    expect(hasTag(mw, 'Middleware')).toBeTruthy()
  })

  it('should decorate ctx.timing', async () => {
    const ctx = createMockCtx()
    const mw = timing()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    const timingCtx = (ctx as Record<string, unknown>)['timing']
    expect(timingCtx).toBeDefined()
  })

  it('should call next after decorating', async () => {
    const ctx = createMockCtx()
    const mw = timing()
    const next = vi.fn()

    await mw.handler(ctx as never, next)

    expect(next).toHaveBeenCalledOnce()
  })
})
```

### 8. Verify

Run the full CI check suite:

```bash
pnpm check && pnpm test
```

## Verification

After completing all steps:

1. Run `pnpm typecheck` and confirm no errors
2. Run `pnpm test` and confirm all tests pass
3. Run `pnpm build --filter=@kidd-cli/core` and confirm the middleware appears in `dist/middleware/`
4. Import the middleware from `@kidd-cli/core/<name>` in a test file and confirm types resolve

## Troubleshooting

### Module augmentation not merging

**Issue:** `ctx.<name>` is not recognized by TypeScript in command handlers.

**Fix:** Ensure the `declare module '@kidd-cli/core'` block is in `types.ts` and the consumer imports the middleware subpath (`@kidd-cli/core/<name>`). The import triggers the augmentation side effect.

### Property not appearing on context at runtime

**Issue:** `ctx.<name>` is `undefined` at runtime even though the middleware is registered.

**Fix:** Verify the middleware calls `decorateContext(ctx, '<name>', value)` before calling `next()`. Confirm the middleware is listed in the `middleware` array of the `cli()` or `command()` call.

### Build output missing the middleware entry

**Issue:** The middleware does not appear in `dist/middleware/` after building.

**Fix:** Verify the entry is added to both `tsdown.config.ts` and `package.json` exports. The entry key in tsdown must match the path used in the exports map (e.g., `'middleware/timing'`).

## References

- [Middleware Standard](../standards/typescript/middleware.md)
- [Design Patterns](../standards/typescript/design-patterns.md)
- [Coding Style](../standards/typescript/coding-style.md)
- [Architecture](../concepts/architecture.md)
