# Quick Start

Get a working CLI in under 5 minutes.

## Install

```bash
pnpm add @kidd-cli/core zod
```

## Create a command

```ts
// src/commands/greet.ts
import { command } from '@kidd-cli/core'
import { z } from 'zod'

export default command({
  description: 'Say hello',
  options: z.object({
    name: z.string().describe('Who to greet'),
  }),
  async handler(ctx) {
    ctx.logger.success(`Hello, ${ctx.args.name}!`)
  },
})
```

## Bootstrap the CLI

```ts
// src/index.ts
import { cli } from '@kidd-cli/core'
import greet from './commands/greet.js'

cli({
  name: 'my-app',
  version: '0.1.0',
  commands: { greet },
})
```

## Run it

```bash
npx tsx src/index.ts greet --name world
```

## Next steps

- [Build a CLI](/guides/build-a-cli) -- middleware, config, autoloading, and sub-exports
- [Lifecycle](/concepts/lifecycle) -- how commands, middleware, and context fit together
- [Add Authentication](/guides/add-authentication) -- auth middleware and token storage
