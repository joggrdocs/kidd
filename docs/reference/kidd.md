# kidd

Core CLI framework for Node.js built on yargs and Zod. Provides structured command definitions, middleware pipelines, configuration loading, and utility sub-exports.

## Key Concepts

### Commands

A command definition pairs a description, typed options (flags), optional positionals, and a handler function. Commands support visibility control via `hidden` and `deprecated` fields.

```ts
const deploy = command({
  description: 'Deploy the application',
  options: z.object({
    env: z.enum(['staging', 'production']).describe('Target environment'),
    dryRun: z.boolean().default(false).describe('Preview without applying'),
  }),
  async handler(ctx) {
    ctx.logger.info(`Deploying to ${ctx.args.env}`)
  },
})
```

#### Yargs-native arg format

As an alternative to Zod, commands accept a yargs-native arg format via `YargsArgDef` for both `options` and `positionals`. Both produce the same typed `ctx.args` -- the yargs format is converted to Zod internally before parsing.

```ts
const deploy = command({
  description: 'Deploy the application',
  options: {
    env: {
      type: 'string',
      description: 'Target environment',
      required: true,
      choices: ['staging', 'production'],
    },
    dryRun: { type: 'boolean', description: 'Preview without applying', default: false },
  },
  async handler(ctx) {
    ctx.logger.info(`Deploying to ${ctx.args.env}`)
  },
})
```

| Field         | Type                                           | Description                                           |
| ------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `type`        | `'string' \| 'number' \| 'boolean' \| 'array'` | Argument type                                         |
| `description` | `string`                                       | Help text                                             |
| `required`    | `boolean`                                      | Whether the arg is required                           |
| `default`     | `unknown`                                      | Default value                                         |
| `alias`       | `string \| string[]`                           | Short aliases                                         |
| `choices`     | `readonly string[]`                            | Allowed values                                        |
| `hidden`      | `Resolvable<boolean>`                          | Omit from `--help` output (flag still works)          |
| `deprecated`  | `Resolvable<string \| boolean>`                | Show deprecation notice in help and on use            |
| `group`       | `string`                                       | Group heading in help output (e.g. `'Auth Options:'`) |

#### Hidden and deprecated commands

Commands support `hidden` and `deprecated` fields to control visibility in help output. Both accept a static value or a function (`Resolvable<T>`), resolved once at registration time.

```ts
// Hidden command -- omitted from --help but still executable
const debug = command({
  description: 'Internal debugging tools',
  hidden: true,
  handler: async (ctx) => {
    /* ... */
  },
})

// Conditionally hidden based on environment
const experimental = command({
  description: 'Experimental feature',
  hidden: () => process.env['NODE_ENV'] === 'production',
  handler: async (ctx) => {
    /* ... */
  },
})

// Deprecated command -- shown with deprecation notice
const oldDeploy = command({
  description: 'Deploy (legacy)',
  deprecated: 'Use "deploy-v2" instead',
  handler: async (ctx) => {
    /* ... */
  },
})
```

The `description` field also accepts a function for dynamic resolution:

```ts
const build = command({
  description: () => (process.env['DEBUG'] === '1' ? 'Build (debug)' : 'Build the project'),
  handler: async (ctx) => {
    /* ... */
  },
})
```

### Middleware

Middleware runs before command handlers. It receives the context and a `next` function.

```ts
const timing = middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.logger.info(`Completed in ${Date.now() - start}ms`)
})
```

### Autoloading

Dynamic command discovery from a directory at runtime.

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  commands: {
    generate: autoload({ dir: './commands/generate' }),
  },
})
```

## Usage

### Bootstrap

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  description: 'My CLI tool',
  commands: { deploy, migrate },
  middleware: [timing],
  config: { schema: MyConfigSchema },
  help: { header: 'my-app - deploy and migrate with ease' },
})
```

### Configuration

```ts
import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: 'dist' },
})
```

The `config` option in `cli()` accepts a `CliConfigOptions` object:

| Field    | Type      | Default             | Description                                      |
| -------- | --------- | ------------------- | ------------------------------------------------ |
| `schema` | `ZodType` | --                  | Zod schema to validate the loaded config         |
| `name`   | `string`  | Derived from `name` | Override the config file name for file discovery |

## Context

The `Context` object is threaded through every handler and middleware. See [Context](../concepts/context.md) for the full reference.

| Property  | Type                                      | Description                                                        |
| --------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `args`    | `DeepReadonly<Merge<KiddArgs, TArgs>>`    | Parsed and validated command args                                  |
| `config`  | `DeepReadonly<Merge<CliConfig, TConfig>>` | Validated runtime config                                           |
| `logger`  | `CliLogger`                               | Structured terminal logger + styled output (check, finding, tally) |
| `prompts` | `Prompts`                                 | Interactive prompts (confirm, text, select, multiselect, password) |
| `spinner` | `Spinner`                                 | Spinner for long-running operations (start, stop, message)         |
| `colors`  | `Colors`                                  | Color formatting utilities (picocolors)                            |
| `format`  | `Format`                                  | Pure string formatters (json, table) — no I/O                      |
| `store`   | `Store`                                   | Typed in-memory key-value store (get, set, has, delete, clear)     |
| `fail`    | `(message, options?) => never`            | Throw a user-facing error                                          |
| `meta`    | `Meta`                                    | CLI metadata (name, version, command path)                         |
| `auth?`   | `AuthContext`                             | Auth credential and login (when `kidd/auth` middleware registered) |

### `ctx.fail()`

Throws a `ContextError` with a clean user-facing message (no stack trace in production).

```ts
ctx.fail('Deployment failed', { code: 'DEPLOY_ERROR', exitCode: 2 })
```

| Option     | Type     | Default | Description                 |
| ---------- | -------- | ------- | --------------------------- |
| `code`     | `string` | --      | Machine-readable error code |
| `exitCode` | `number` | `1`     | Process exit code           |

## Module Augmentation

kidd exposes empty interfaces that consumers extend via TypeScript declaration merging. This adds project-wide type safety to `ctx.args`, `ctx.config`, and `ctx.store` without threading generics.

For `CliConfig`, use the `ConfigType` utility to derive the type from your Zod schema so the augmentation stays in sync automatically:

```ts
import type { ConfigType } from '@kidd-cli/core'
import { z } from 'zod'

export const configSchema = z.object({
  apiUrl: z.string().url(),
  org: z.string().min(1),
})

declare module '@kidd-cli/core' {
  interface KiddArgs {
    verbose: boolean
  }

  interface CliConfig extends ConfigType<typeof configSchema> {}

  interface KiddStore {
    token: string
  }
}
```

Run `kidd add config` to scaffold a config schema with `ConfigType` wiring, or pass `--config` to `kidd init`.

| Interface   | Affects      | Description                                                                                     |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `KiddArgs`  | `ctx.args`   | Global args merged into every command's args                                                    |
| `CliConfig` | `ctx.config` | Global config merged into every command's config                                                |
| `KiddStore` | `ctx.store`  | Global store keys merged into the store type                                                    |
| `StoreMap`  | `ctx.store`  | The store's full key-value shape — extend this to register typed keys (merges with `KiddStore`) |

## `decorateContext()`

Add a typed, immutable property to a context instance at runtime. Middleware authors use this to extend `ctx` with custom properties (e.g., `ctx.api`, `ctx.auth`). The property is non-writable and non-configurable after assignment.

```ts
import { decorateContext, middleware } from '@kidd-cli/core'

import type { HttpClient } from '@kidd-cli/core/http'

declare module '@kidd-cli/core' {
  interface Context {
    readonly github: HttpClient
  }
}

const github = middleware(async (ctx, next) => {
  decorateContext(ctx, 'github', createHttpClient({ baseUrl: 'https://api.github.com' }))
  await next()
})
```

Pair with module augmentation on the `Context` interface so downstream handlers see the property at compile time.

| Parameter | Type      | Description                             |
| --------- | --------- | --------------------------------------- |
| `ctx`     | `Context` | The context instance (mutated in place) |
| `key`     | `string`  | The property name                       |
| `value`   | `unknown` | The property value                      |

Returns the same `ctx` reference with the new property attached.

## Sub-exports

| Export                   | Purpose                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@kidd-cli/core/logger`  | Structured terminal logger (`createCliLogger`, `cliLogger`)                                                                                           |
| `@kidd-cli/core/config`  | Config loading and validation (`createConfigClient`)                                                                                                  |
| `@kidd-cli/core/store`   | File-backed JSON store (`createStore`)                                                                                                                |
| `@kidd-cli/core/project` | Git root resolution, path utilities (`findProjectRoot`, `isInSubmodule`, `getParentRepoRoot`, `resolvePath`, `resolveLocalPath`, `resolveGlobalPath`) |
| `@kidd-cli/core/format`  | Standalone format functions (`formatCheck`, `formatFinding`, `formatCodeFrame`, `formatTally`, `formatDuration`)                                      |
| `@kidd-cli/core/auth`    | Auth middleware, credential types, strategies (`auth`)                                                                                                |
| `@kidd-cli/core/http`    | Typed HTTP client middleware (`http`, `createHttpClient`)                                                                                             |

## Resources

- [yargs](https://yargs.js.org)
- [Zod](https://zod.dev)
- [@clack/prompts](https://www.clack.cc)

## References

- [Build a CLI](../guides/build-a-cli.md)
- [Add Authentication](../guides/add-authentication.md)
- [Context](../concepts/context.md)
- [Configuration](../concepts/configuration.md)
- [Authentication](../concepts/authentication.md)
- [Lifecycle](../concepts/lifecycle.md)
