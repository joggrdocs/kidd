# Module Augmentation

Kidd uses TypeScript module augmentation (declaration merging) to add project-wide type safety without threading generics through every handler, middleware, and command file. Define a schema or type once, augment the corresponding interface, and every `ctx` reference across the codebase picks up the correct types automatically.

## Why Module Augmentation

CLI frameworks face a typing challenge: commands are defined in separate files and often dynamically imported. Generic type parameters cannot propagate across these boundaries without explicit threading, which is verbose and fragile. Module augmentation solves this by letting consumers extend kidd's interfaces at the declaration site. TypeScript merges the declarations globally, so every file that imports from `@kidd-cli/core` sees the augmented types.

## Augmentable Interfaces

| Interface          | Module                  | Affects                    | Description                                            |
| ------------------ | ----------------------- | -------------------------- | ------------------------------------------------------ |
| `KiddArgs`         | `@kidd-cli/core`        | `ctx.args`                 | Global args merged into every command's args            |
| `KiddStore`        | `@kidd-cli/core`        | `ctx.store`                | Global store keys merged into the store type            |
| `StoreMap`         | `@kidd-cli/core`        | `ctx.store`                | Full key-value shape of the store (merges with `KiddStore`) |
| `ConfigRegistry`   | `@kidd-cli/core/config` | `ctx.config.load()` result | Typed config returned by `load()`                      |
| `CommandContext`   | `@kidd-cli/core`        | `ctx`                      | Add middleware-decorated properties (e.g. `api`, `report`) |

## The Pattern

Every augmentation follows the same three steps:

1. **Define the schema or type** -- a Zod schema, an interface, or a type alias.
2. **Augment the interface** -- use `declare module` to merge your type into kidd's interface.
3. **Get typed context** -- all handlers and middleware see the augmented types on `ctx`.

## KiddArgs

Add global args that appear on `ctx.args` in every command. Useful for flags like `--verbose` or `--json` that apply CLI-wide.

```ts
// src/types.ts
declare module '@kidd-cli/core' {
  interface KiddArgs {
    verbose: boolean
    json: boolean
  }
}
```

Every command handler now sees `ctx.args.verbose` and `ctx.args.json` as typed properties, in addition to the command's own args.

## KiddStore

Add typed keys to the in-memory store. Useful for middleware-to-handler data flow where the key and value type should be known at compile time.

```ts
// src/types.ts
declare module '@kidd-cli/core' {
  interface KiddStore {
    token: string
    user: { readonly id: string; readonly name: string }
  }
}
```

Now `ctx.store.get('token')` returns `string | undefined` and `ctx.store.set('user', { id: '1', name: 'Alice' })` is type-checked.

## StoreMap

`StoreMap` is the full key-value shape of the store. It merges with `KiddStore`, so both interfaces contribute to the store type. Use `StoreMap` when you want to register store keys from a specific module rather than globally:

```ts
// src/middleware/analytics.ts
declare module '@kidd-cli/core' {
  interface StoreMap {
    analyticsId: string
  }
}
```

## ConfigRegistry

Typed config uses a two-step pattern: define a Zod schema, then augment `ConfigRegistry` using the `ConfigType` utility to derive the type from the schema.

```ts
// src/config.ts
import type { ConfigType } from '@kidd-cli/core/config'
import { z } from 'zod'

export const configSchema = z.object({
  apiUrl: z.string().url(),
  org: z.string().min(1),
  region: z.enum(['us-east-1', 'eu-west-1']),
})

declare module '@kidd-cli/core/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

After this augmentation, `ctx.config.load()` returns a result where `config.apiUrl` is `string`, `config.org` is `string`, and `config.region` is `'us-east-1' | 'eu-west-1'`.

The `extends ConfigType<typeof configSchema>` pattern keeps the schema as the single source of truth -- the registry type is always derived from it, so they cannot drift apart.

## CommandContext

Middleware that decorates the context with new properties should augment `CommandContext` so handlers see the property as typed. This is how `auth`, `icons`, `report`, `figures`, and `http` expose their context APIs.

### Automatic augmentation (sub-exports)

Some middleware sub-exports include the augmentation in their type declarations. Importing them is sufficient:

| Sub-export               | Property      | Type             |
| ------------------------ | ------------- | ---------------- |
| `@kidd-cli/core/auth`   | `ctx.auth`    | `AuthContext`    |
| `@kidd-cli/core/config` | `ctx.config`  | `ConfigHandle`   |
| `@kidd-cli/core/icons`  | `ctx.icons`   | `IconsContext`   |
| `@kidd-cli/core/report` | `ctx.report`  | `Report`         |
| `@kidd-cli/core/figures`| `ctx.figures` | `FiguresContext` |

When you import `auth` from `@kidd-cli/core/auth`, the `declare module` block in that sub-export merges `auth: AuthContext` onto `CommandContext` automatically.

### Manual augmentation (http namespace)

The `http()` middleware uses a dynamic namespace, so it cannot augment `CommandContext` automatically. Declare the property yourself:

```ts
// src/types.ts
import type { HttpClient } from '@kidd-cli/core/http'

declare module '@kidd-cli/core' {
  interface CommandContext {
    readonly api: HttpClient
  }
}
```

For multiple HTTP clients, declare each namespace:

```ts
declare module '@kidd-cli/core' {
  interface CommandContext {
    readonly api: HttpClient
    readonly admin: HttpClient
  }
}
```

## Full Example

A project with global args, typed config, a custom store key, and an HTTP client:

```ts
// src/types.ts
import type { ConfigType } from '@kidd-cli/core/config'
import type { HttpClient } from '@kidd-cli/core/http'

import { configSchema } from './config.js'

declare module '@kidd-cli/core' {
  interface KiddArgs {
    verbose: boolean
  }

  interface KiddStore {
    currentUser: { readonly id: string; readonly email: string }
  }

  interface CommandContext {
    readonly api: HttpClient
  }
}

declare module '@kidd-cli/core/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

Every handler in the project now has typed access to:

- `ctx.args.verbose` -- `boolean`
- `ctx.store.get('currentUser')` -- `{ readonly id: string; readonly email: string } | undefined`
- `ctx.api.get<T>(path)` -- `Promise<TypedResponse<T>>`
- `ctx.config.load()` -- returns typed config matching the Zod schema

## Common Mistakes

### Augmenting the wrong module

Config augmentation targets `@kidd-cli/core/config`, not `@kidd-cli/core`. Other interfaces target `@kidd-cli/core`.

```ts
// Correct
declare module '@kidd-cli/core/config' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}

// Incorrect -- ConfigRegistry does not exist on @kidd-cli/core
declare module '@kidd-cli/core' {
  interface ConfigRegistry extends ConfigType<typeof configSchema> {}
}
```

### Forgetting `extends` on ConfigRegistry

`ConfigRegistry` must extend `ConfigType<typeof schema>` to derive the type from the Zod schema. Without `extends`, the interface is empty and `ctx.config.load()` returns a generic record.

```ts
// Correct
interface ConfigRegistry extends ConfigType<typeof configSchema> {}

// Incorrect -- empty interface, no type narrowing
interface ConfigRegistry {}
```

### Placing augmentations in unreachable files

The `declare module` block must be in a file that TypeScript includes in the compilation. If the file is not imported (directly or transitively) and is not matched by `tsconfig.json` `include`, the augmentation is invisible. A common pattern is to place all augmentations in a `src/types.ts` file that is imported by the CLI entrypoint.

### Declaring properties without `readonly`

Kidd's context properties are immutable. Always mark augmented properties as `readonly`:

```ts
// Correct
interface CommandContext {
  readonly api: HttpClient
}

// Incorrect -- allows mutation
interface CommandContext {
  api: HttpClient
}
```

## References

- [Context](./context.md)
- [Configuration](./configuration.md)
- [Authentication](./authentication.md)
- [Icons](./icons.md)
- [Reporting](./reporting.md)
- [Core Reference](/reference/packages/kidd)
- [cli() Reference](/reference/framework/bootstrap)
