# kidd

An opinionated CLI framework for Node.js built on yargs and Zod.

## Installation

```bash
pnpm add kidd
```

## Usage

```ts
import { cli, command } from 'kidd'
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

cli({
  name: 'my-app',
  version: '1.0.0',
  commands: { greet },
})
```

## API

### `cli()`

Bootstrap and run the CLI application. Registers commands, parses arguments, loads config, resolves credentials, runs middleware, and invokes the matched command handler.

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

Create a command definition. Accepts a description, optional args (Zod schema or yargs-style), optional subcommands, and a handler function.

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

Create a middleware that runs before command handlers. Middleware receives the context and a `next` function to continue the chain.

```ts
const timing = middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.logger.info(`Completed in ${Date.now() - start}ms`)
})
```

### `autoload()`

Create an autoload marker for dynamic command discovery from a directory.

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
import { defineConfig } from 'kidd'

export default defineConfig({
  build: { out: 'dist' },
})
```

## Sub-exports

### `kidd/prompts`

Interactive terminal prompts backed by `@clack/prompts`. Exports `createPromptUtils()` and `createSpinner()` factories, plus default `prompts` and `spinner` instances.

```ts
import { prompts, spinner } from 'kidd/prompts'

const name = await prompts.text({ message: 'Project name?' })

spinner.start('Building...')
spinner.stop('Done')
```

### `kidd/logger`

Structured terminal logger backed by `@clack/prompts`. Exports `createLogger()` factory and a default `log` instance.

```ts
import { log } from 'kidd/logger'

log.intro('My CLI')
log.info('Processing...')
log.success('Complete')
log.outro('Done')
```

### `kidd/output`

Structured output utilities for JSON serialization, Liquid template rendering, and file writing. Exports `createOutput()` factory and a default `output` instance.

```ts
import { output } from 'kidd/output'

output.json({ status: 'ok' })
output.write({ path: './out.json', content: output.toJson(data) })
```

### `kidd/errors`

Error creation, formatting, and sanitization utilities. Exports `createErrorUtil()` factory plus standalone helpers: `formatError()`, `sanitize()`, `redactObject()`, `SENSITIVE_PATTERNS`, and `REDACT_PATHS`.

```ts
import { createErrorUtil, sanitize } from 'kidd/errors'

const errors = createErrorUtil({ prefix: 'deploy', sanitize: true })
const err = errors.create('Connection refused')
const msg = errors.getMessage(unknownError)
const clean = sanitize('token=abc123&secret=xyz')
```

### `kidd/config`

Typed config client that loads, validates, and writes JSON/JSONC/YAML config files. Exports `createConfigClient()` factory plus error factories `createParseError()` and `createValidationError()`.

```ts
import { createConfigClient } from 'kidd/config'

const config = createConfigClient({ name: 'my-app', schema: MySchema })
const [error, result] = await config.load()
```

### `kidd/store`

File-backed JSON store with project-local and global home directory resolution.

```ts
import { createStore } from 'kidd/store'

const store = createStore({ dirName: '.my-app' })
const settings = store.load('settings.json')
```

### `kidd/validate`

Zod-based validation returning Result tuples.

```ts
import { validate } from 'kidd/validate'

const [error, value] = validate(
  MySchema,
  input,
  (zodError) => new Error(`Invalid: ${zodError.message}`)
)
```

### `kidd/project`

Git project root resolution, submodule detection, and dotenv loading. Exports `findProjectRoot()`, `isInSubmodule()`, `getParentRepoRoot()`, `createDotEnv()`, and `createCredentialLoader()`.

```ts
import { findProjectRoot, createDotEnv, isInSubmodule } from 'kidd/project'

const root = findProjectRoot()
const env = createDotEnv({ dirName: '.my-app' })
const vars = await env.load()
const submodule = isInSubmodule()
```

## References

- [yargs](https://yargs.js.org)
- [Zod](https://zod.dev)
- [@clack/prompts](https://www.clack.cc)
