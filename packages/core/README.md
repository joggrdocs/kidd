# @kidd-cli/core

An opinionated CLI framework for Node.js built on yargs, Zod, and functional TypeScript patterns.

## Installation

```bash
pnpm add @kidd-cli/core
```

## Usage

### Define a CLI

```ts
import { cli } from '@kidd-cli/core'

await cli({
  name: 'my-tool',
  version: '1.0.0',
  description: 'A CLI built with kidd',
  commands: './commands',
})
```

### Define a command

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Greet a user',
  options: {
    name: { type: 'string', description: 'Name to greet', demandOption: true },
  },
  handler: async (ctx) => {
    ctx.logger.info(`Hello, ${ctx.options.name}!`)
  },
})
```

### Define middleware

```ts
import { middleware, decorateContext } from '@kidd-cli/core'

const withUser = middleware<{ Variables: { user: User } }>(async (ctx, next) => {
  decorateContext(ctx, 'user', await fetchUser())
  await next()
})
```

### Configuration

Create a `kidd.config.ts` in your project root:

```ts
import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
})
```

## Subpath exports

| Export                   | Description                        |
| ------------------------ | ---------------------------------- |
| `@kidd-cli/core`         | CLI bootstrap, command, middleware |
| `@kidd-cli/core/logger`  | Structured logging                 |
| `@kidd-cli/core/config`  | Runtime config access              |
| `@kidd-cli/core/format`  | Terminal formatting utilities      |
| `@kidd-cli/core/store`   | Key-value store                    |
| `@kidd-cli/core/project` | Project detection helpers          |
| `@kidd-cli/core/auth`    | Authentication middleware          |
| `@kidd-cli/core/http`    | HTTP client middleware             |
| `@kidd-cli/core/icons`   | Icon set middleware                |
| `@kidd-cli/core/test`    | Test utilities for commands        |

## License

MIT -- [GitHub](https://github.com/joggrdocs/kidd)
