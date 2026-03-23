# Context

The central API surface threaded through every handler and middleware. Provides typed access to args, config, log, format, store, error handling, and CLI metadata.

## Properties

| Property  | Type                                      | Description                                                        |
| --------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `args`    | `DeepReadonly<Merge<KiddArgs, TArgs>>`    | Parsed and validated command args                                  |
| `colors`  | `Colors`                                  | Color formatting utilities (picocolors)                            |
| `config`  | `DeepReadonly<Merge<CliConfig, TConfig>>` | Validated runtime config                                           |
| `format`  | `Format`                                  | Pure string formatters (no I/O)                                    |
| `log`     | `Log`                                     | Logging methods (info, success, error, warn, etc.)                 |
| `prompts` | `Prompts`                                 | Interactive prompts (confirm, text, select, etc.)                  |
| `spinner` | `Spinner`                                 | Spinner for long-running operations (start, stop, message)         |
| `store`   | `Store`                                   | Typed in-memory key-value store                                    |
| `fail`    | `(message, options?) => never`            | Throw a user-facing error                                          |
| `meta`    | `Meta`                                    | CLI metadata                                                       |
| `auth`    | `AuthContext`                             | Auth credential and login (when `@kidd-cli/core/auth` middleware registered) |

## `ctx.args`

Deeply readonly parsed args for the matched command. The type is a merge of `KiddArgs` (global augmentation) and the command's own args definition.

```ts
const deploy = command({
  options: z.object({
    env: z.enum(['staging', 'production']).describe('Target environment'),
  }),
  async handler(ctx) {
    ctx.args.env // 'staging' | 'production'
  },
})
```

## `ctx.config`

Deeply readonly validated config loaded from the project's config file. The type is a merge of `CliConfig` (global augmentation) and the schema passed to `cli({ config: { schema } })`.

Use `ConfigType` with module augmentation to derive `CliConfig` from your Zod schema:

```ts
// src/config.ts
import type { ConfigType } from '@kidd-cli/core'
import { z } from 'zod'

export const configSchema = z.object({
  apiUrl: z.string().url(),
  org: z.string().min(1),
})

declare module '@kidd-cli/core' {
  interface CliConfig extends ConfigType<typeof configSchema> {}
}
```

Then pass the schema to `cli()`:

```ts
import { cli } from '@kidd-cli/core'
import { configSchema } from './config.js'

cli({
  name: 'my-app',
  version: '1.0.0',
  config: { schema: configSchema },
  commands: import.meta.dirname + '/commands',
})
```

Commands can now access typed config properties:

```ts
export default command({
  async handler(ctx) {
    ctx.config.apiUrl // string
    ctx.config.org // string
  },
})
```

Run `kidd add config` to scaffold this setup in an existing project, or pass `--config` to `kidd init` when creating a new project.

## `ctx.log`

Structured logging API on the base context. All logging methods write to stderr.

| Method                    | Description                          |
| ------------------------- | ------------------------------------ |
| `info(message)`           | Log an informational message         |
| `success(message)`        | Log a success message                |
| `error(message)`          | Log an error message                 |
| `warn(message)`           | Log a warning message                |
| `step(message)`           | Log a step indicator                 |
| `message(message, opts?)` | Log a message with optional symbol   |
| `intro(title?)`           | Print an intro banner                |
| `outro(message?)`         | Print an outro banner                |
| `note(message?, title?)`  | Display a boxed note                 |
| `newline()`               | Write a blank line                   |
| `raw(text)`               | Write raw text followed by a newline |

```ts
ctx.log.intro('my-app v1.0.0')
ctx.log.info('Starting deployment...')
ctx.log.success('Deployed successfully')
ctx.log.outro('Done')
```

## `ctx.prompts`

Interactive prompts that suspend execution until the user provides input. Cancellation (Ctrl-C) throws a `ContextError` with code `PROMPT_CANCELLED`.

| Method                 | Returns            | Description        |
| ---------------------- | ------------------ | ------------------ |
| `confirm(opts)`        | `Promise<boolean>` | Yes/no prompt      |
| `text(opts)`           | `Promise<string>`  | Free-text input    |
| `select<T>(opts)`      | `Promise<T>`       | Single-select list |
| `multiselect<T>(opts)` | `Promise<T[]>`     | Multi-select list  |
| `password(opts)`       | `Promise<string>`  | Masked text input  |

```ts
const env = await ctx.prompts.select({
  message: 'Target environment',
  options: [
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'production' },
  ],
})
```

## `ctx.spinner`

Manage a spinner for long-running operations.

| Method             | Description                           |
| ------------------ | ------------------------------------- |
| `start(message)`   | Start the spinner with a message      |
| `stop(message)`    | Stop the spinner with a final message |
| `message(message)` | Update the spinner message            |

```ts
ctx.spinner.start('Bundling...')
ctx.spinner.message('Compiling binaries...')
ctx.spinner.stop('Build complete')
```

## `ctx.colors`

Color formatting utilities powered by [picocolors](https://github.com/alexeyraspopov/picocolors). Use for coloring summary values, diagnostic output, and other terminal text.

```ts
const c = ctx.colors
ctx.log.info(`Status: ${c.green('passing')}`)
```

Available formatters: `bold`, `dim`, `italic`, `underline`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, and more.

## `ctx.format`

Pure string formatters for data serialization. These return strings and perform no I/O -- write the result to stdout yourself.

| Method        | Returns  | Description                                         |
| ------------- | -------- | --------------------------------------------------- |
| `json(data)`  | `string` | Serialize a value as pretty-printed JSON            |
| `table(rows)` | `string` | Format an array of objects as an aligned text table |

```ts
// JSON output
process.stdout.write(ctx.format.json({ name: 'deploy', status: 'success' }))

// Table output
process.stdout.write(
  ctx.format.table([
    { name: 'deploy', status: 'success' },
    { name: 'migrate', status: 'skipped' },
  ])
)
```

## `ctx.store`

Typed in-memory key-value store for passing data between middleware and handlers. This is the recommended way to communicate state through the middleware chain.

| Method            | Description                                  |
| ----------------- | -------------------------------------------- |
| `get(key)`        | Get a value (returns `undefined` if not set) |
| `set(key, value)` | Set a value                                  |
| `has(key)`        | Check if a key exists                        |
| `delete(key)`     | Delete a key                                 |
| `clear()`         | Remove all entries                           |

```ts
const loadUser = middleware(async (ctx, next) => {
  ctx.store.set('user', await fetchUser())
  await next()
})

const deploy = command({
  middleware: [loadUser],
  async handler(ctx) {
    const user = ctx.store.get('user')
  },
})
```

## `ctx.fail()`

Throws a `ContextError` with a clean user-facing message. No stack trace is shown in production. The process exits with the specified exit code.

```ts
ctx.fail('Deployment failed')
ctx.fail('Invalid token', { code: 'AUTH_ERROR', exitCode: 2 })
```

| Option     | Type     | Default | Description                 |
| ---------- | -------- | ------- | --------------------------- |
| `code`     | `string` | --      | Machine-readable error code |
| `exitCode` | `number` | `1`     | Process exit code           |

## `ctx.meta`

Deeply readonly CLI metadata.

| Property  | Type           | Description                                                   |
| --------- | -------------- | ------------------------------------------------------------- |
| `name`    | `string`       | CLI name as defined in `cli({ name })`                        |
| `version` | `string`       | CLI version as defined in `cli({ version })`                  |
| `command` | `string[]`     | The resolved command path (e.g. `['deploy', 'preview']`)      |
| `dirs`    | `ResolvedDirs` | Resolved directory names for file-backed stores (auth, config) |

`dirs` contains `local` (resolved relative to the project root) and `global` (resolved relative to `~`). Both default to `.<cli-name>`.

## `ctx.auth`

Auth context decorated by the `auth()` middleware from `@kidd-cli/core/auth`. Only present when the auth middleware is registered.

| Property           | Type                                     | Description                                     |
| ------------------ | ---------------------------------------- | ----------------------------------------------- |
| `credential()`     | `AuthCredential \| null`                 | Passively resolved credential (file, env)       |
| `authenticated()`  | `boolean`                                | Whether a passive credential exists             |
| `login(options?)`  | `AsyncResult<AuthCredential, AuthError>` | Run interactive strategies, persist, and return |
| `logout()`         | `AsyncResult<string, AuthError>`         | Remove stored credential from disk              |

```ts
if (!ctx.auth.credential()) {
  ctx.fail('Not authenticated. Run `my-app login` first.')
}

const [error, credential] = await ctx.auth.login()
if (error) {
  ctx.fail(error.message)
}
```

See [Authentication](./authentication.md) for the full auth system reference.

## Module Augmentation

kidd exposes empty interfaces that consumers extend via TypeScript declaration merging. This adds project-wide type safety without threading generics through every handler.

For `CliConfig`, use the `ConfigType` utility to derive the type from your Zod schema (see [`ctx.config`](#ctxconfig) above). For other interfaces, extend them directly:

```ts
declare module '@kidd-cli/core' {
  interface KiddArgs {
    verbose: boolean
  }

  // Prefer ConfigType<typeof schema> over manual properties -- see ctx.config docs
  interface CliConfig extends ConfigType<typeof configSchema> {}

  interface KiddStore {
    token: string
  }
}
```

| Interface   | Affects      | Description                                                                                     |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `KiddArgs`  | `ctx.args`   | Global args merged into every command's args                                                    |
| `CliConfig` | `ctx.config` | Global config merged into every command's config                                                |
| `KiddStore` | `ctx.store`  | Global store keys merged into the store type                                                    |
| `StoreMap`  | `ctx.store`  | The store's full key-value shape -- extend this to register typed keys (merges with `KiddStore`) |

## References

- [kidd API Reference](../reference/kidd.md)
- [Lifecycle](./lifecycle.md)
- [Configuration](./configuration.md)
- [Authentication](./authentication.md)
