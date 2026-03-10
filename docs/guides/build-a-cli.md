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
  args: z.object({
    env: z.enum(['staging', 'production']).describe('Target environment'),
    dryRun: z.boolean().default(false).describe('Preview without applying'),
  }),
  async handler(ctx) {
    ctx.logger.info(`Deploying to ${ctx.args.env}`)
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
  ctx.logger.info(`Completed in ${Date.now() - start}ms`)
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
    ctx.output.write('Deploying')
  },
})
```

Root middleware wraps command middleware, which wraps the handler. See [Lifecycle](../concepts/lifecycle.md) for the full execution model.

### 4. Add subcommands

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

### 5. Autoload commands from a directory

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

### 6. Add a config file

Create a type-safe `kidd.config.ts`:

```ts
import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: 'dist' },
})
```

Load and validate config from within commands using the config client:

```ts
import { createConfigClient } from '@kidd-cli/core/config'

const config = createConfigClient({ name: 'my-app', schema: MySchema })
const [error, result] = await config.load()
```

### 7. Use sub-exports

kidd exposes focused utilities through sub-exports.

**Logger** -- structured terminal output:

```ts
import { cliLogger } from '@kidd-cli/core/logger'

cliLogger.intro('My CLI')
cliLogger.info('Processing...')
cliLogger.success('Complete')
cliLogger.outro('Done')
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
