# Build a CLI

Define commands, middleware, configuration, and use kidd's sub-exports to build a complete CLI tool.

## Prerequisites

- Node.js 22+
- `@kidd-cli/core` installed (`pnpm add @kidd-cli/core`)

## Steps

### 1. Define a command

Commands accept a description, typed arguments via Zod, and a handler function.

```ts
import { command } from '@kidd-cli/core'
import { z } from 'zod'

const deploy = command({
  description: 'Deploy the application',
  options: z.object({
    env: z.enum(['staging', 'production']).describe('Target environment'),
    dryRun: z.boolean().default(false).describe('Preview without applying'),
  }),
  async handler(ctx) {
    ctx.log.info(`Deploying to ${ctx.args.env}`)
  },
})
```

### 2. Bootstrap the CLI

`cli()` registers commands, parses arguments, loads config, runs middleware, and invokes the matched handler.

```ts
import { cli } from '@kidd-cli/core'

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

### 3. Add middleware

Middleware wraps command execution with pre/post logic. It receives the context and a `next` function.

**Root middleware** runs for every command:

```ts
import { middleware } from '@kidd-cli/core'

const timing = middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.log.info(`Completed in ${Date.now() - start}ms`)
})

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [timing],
  commands: { deploy },
})
```

**Command middleware** runs only for a specific command:

```ts
const requireAuth = middleware(async (ctx, next) => {
  if (!process.env['API_TOKEN']) {
    ctx.fail('Missing API_TOKEN')
  }
  await next()
})

const deploy = command({
  description: 'Deploy the application',
  middleware: [requireAuth],
  async handler(ctx) {
    ctx.log.raw('Deploying')
  },
})
```

Root middleware wraps command middleware, which wraps the handler. See [Lifecycle](../concepts/lifecycle.md) for the full execution model.

### 4. Hide or deprecate commands

Commands support `hidden` and `deprecated` fields for controlling help output visibility. Both accept a static value or a function (`Resolvable<T>`), resolved once at registration time.

```ts
// Hidden from --help but still callable
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

// Deprecated command with message
const legacyDeploy = command({
  description: 'Deploy (legacy)',
  deprecated: 'Use "deploy-v2" instead',
  handler: async (ctx) => {
    /* ... */
  },
})
```

Individual flags also support `hidden`, `deprecated`, and `group` for organizing help output:

```ts
const build = command({
  description: 'Build the project',
  options: {
    trace: { type: 'boolean', description: 'Enable tracing', hidden: true },
    output: { type: 'string', description: 'Output dir', group: 'Build Options:' },
    legacy: { type: 'boolean', description: 'Legacy mode', deprecated: 'Use --modern' },
  },
  handler: async (ctx) => {
    /* ... */
  },
})
```

### 5. Add subcommands

Commands can contain nested subcommands:

```ts
const generate = command({
  description: 'Code generation utilities',
  commands: {
    types: generateTypes,
    schema: generateSchema,
  },
})
```

### 6. Autoload commands from a directory

Dynamically discover commands at runtime:

```ts
import { autoload } from '@kidd-cli/core'

cli({
  name: 'my-app',
  version: '1.0.0',
  commands: {
    generate: autoload({ dir: './commands/generate' }),
  },
})
```

### 7. Add typed config

Scaffold config setup with the CLI, or create the files manually.

**Scaffold with the CLI:**

```bash
kidd add config
```

This creates `src/config.ts` with a Zod schema and `ConfigType` module augmentation. You can also include config setup when creating a new project:

```bash
kidd init --config
```

**Manual setup:**

Create a config schema file with `ConfigType` to derive `CliConfig` from your Zod schema:

```ts
// src/config.ts
import type { ConfigType } from '@kidd-cli/core'
import { z } from 'zod'

export const configSchema = z.object({
  apiUrl: z.string().url(),
  region: z.string().default('us-east-1'),
})

declare module '@kidd-cli/core' {
  interface CliConfig extends ConfigType<typeof configSchema> {}
}
```

Pass the schema to `cli()`:

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

Commands now see fully typed `ctx.config`:

```ts
export default command({
  async handler(ctx) {
    ctx.config.apiUrl // string
    ctx.config.region // string
  },
})
```

**Standalone config client:**

For loading config outside the `cli()` bootstrap, use `createConfigClient`:

```ts
import { createConfigClient } from '@kidd-cli/core/config'

const config = createConfigClient({ name: 'my-app', schema: MySchema })
const [error, result] = await config.load()
```

### 8. Use sub-exports

kidd exposes focused utilities through sub-exports.

**Log** -- structured terminal output is available on every context:

```ts
// In any command handler or middleware:
ctx.log.intro('My CLI')
ctx.log.info('Processing...')
ctx.log.success('Complete')
ctx.log.outro('Done')
```

**Store** -- file-backed JSON store for persistent data (separate from the in-memory `ctx.store` used for middleware-to-handler data flow):

```ts
import { createStore } from '@kidd-cli/core/store'

const store = createStore({ dirName: '.my-app' })
const settings = store.load('settings.json')
```

**Project** -- git root resolution, submodule detection, path utilities:

```ts
import { findProjectRoot, isInSubmodule, resolvePath } from '@kidd-cli/core/project'

const root = findProjectRoot()
const inSubmodule = isInSubmodule()
const appDir = resolvePath({ dirName: '.my-app' })
```

`findProjectRoot` returns `ProjectRoot | null` (with `path` and `isSubmodule` properties). `resolvePath` accepts `{ dirName, source?, startDir? }` and resolves to a local or global directory path.

## Verification

```bash
npx my-app --help
npx my-app deploy --env staging --dry-run
```

## Troubleshooting

### Autoload finds no commands

**Issue:** `autoload()` returns an empty command tree.

**Fix:** Ensure the `dir` path is relative to the compiled entrypoint, not the source file. Check that each file in the directory exports a `command()` as its default export.

### Config file not found

**Issue:** `config.load()` returns a parse error.

**Fix:** Confirm the config file is named `kidd.config.ts` (or `.js`, `.json`, `.yaml`) and is in the project root.

## Resources

- [yargs](https://yargs.js.org)
- [Zod](https://zod.dev)
- [@clack/prompts](https://www.clack.cc)

## References

- [kidd API Reference](../reference/kidd.md)
