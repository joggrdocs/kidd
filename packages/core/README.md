# kidd

An opinionated CLI framework for Node.js built on yargs and Zod.

## Installation

```bash
pnpm add kidd
```

## Usage

```ts
import { cli, command } from '@kidd-cli/core'
import { z } from 'zod'

const greet = command({
  description: 'Greet a user',
  args: z.object({
    name: z.string().describe('Name to greet'),
  }),
  async handler(ctx) {
    ctx.logger.info(`Hello, ${ctx.args.name}!`)
  },
})

await cli({
  name: 'my-app',
  version: '1.0.0',
  commands: { greet },
})
```

## API

### `cli()`

Bootstrap and run the CLI application.

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  description: 'My CLI tool',
  commands: { deploy, migrate },
  middleware: [requireAuth()],
  config: { schema: MyConfigSchema },
  credentials: {
    apiKey: { env: 'API_KEY', required: true },
  },
})
```

### `command()`

Create a command definition.

```ts
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

### `middleware()`

Create a middleware that runs before command handlers.

```ts
const timing = middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.logger.info(`Completed in ${Date.now() - start}ms`)
})
```

### `autoload()`

Dynamically discover commands from a directory.

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  commands: {
    generate: autoload({ dir: './commands/generate' }),
  },
})
```

### `defineConfig()`

Type-safe helper for `kidd.config.ts` files.

```ts
import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: 'dist' },
})
```

## Sub-exports

### `kidd/prompts`

Interactive terminal prompts backed by `@clack/prompts`.

```ts
import { prompts, spinner } from '@kidd-cli/core/prompts'

const name = await prompts.text({ message: 'Project name?' })

spinner.start('Building...')
spinner.stop('Done')
```

### `kidd/logger`

Structured terminal logger backed by `@clack/prompts`.

```ts
import { log } from '@kidd-cli/core/logger'

log.intro('My CLI')
log.info('Processing...')
log.success('Complete')
log.outro('Done')
```

### `kidd/output`

Structured output for JSON, templates, and files.

```ts
import { output } from '@kidd-cli/core/output'

output.json({ status: 'ok' })
output.write({ path: './out.json', content: output.toJson(data) })
```

### `kidd/errors`

Error creation, formatting, and sanitization utilities.

```ts
import { createErrorUtil, sanitize } from '@kidd-cli/core/errors'

const errors = createErrorUtil({ prefix: 'deploy', sanitize: true })
const err = errors.create('Connection refused')
const msg = errors.getMessage(unknownError)
const clean = sanitize('token=abc123&secret=xyz')
```

### `kidd/config`

Typed config client for JSON/JSONC/YAML files.

```ts
import { createConfigClient } from '@kidd-cli/core/config'

const config = createConfigClient({ name: 'my-app', schema: MySchema })
const [error, result] = await config.load()
```

### `kidd/store`

File-backed JSON store with local and global resolution.

```ts
import { createStore } from '@kidd-cli/core/store'

const store = createStore({ dirName: '.my-app' })
const settings = store.load('settings.json')
```

### `kidd/validate`

Zod-based validation returning Result tuples.

```ts
import { validate } from '@kidd-cli/core/validate'

const [error, value] = validate(
  MySchema,
  input,
  (zodError) => new Error(`Invalid: ${zodError.message}`)
)
```

### `kidd/project`

Git project root resolution, submodule detection, and dotenv loading.

```ts
import { findProjectRoot, createDotEnv, isInSubmodule } from '@kidd-cli/core/project'

const root = findProjectRoot()
const env = createDotEnv({ dirName: '.my-app' })
const vars = await env.load()
const submodule = isInSubmodule()
```

## References

- [yargs](https://yargs.js.org)
- [Zod](https://zod.dev)
- [@clack/prompts](https://www.clack.cc)
