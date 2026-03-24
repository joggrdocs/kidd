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

## Add middleware

Middleware wraps every command in an onion model -- each middleware can run logic before and after the handler. Here is a simple timing middleware:

```ts
// src/middleware/timing.ts
import { middleware } from '@kidd-cli/core'

export const timing = middleware(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.logger.info(`Completed in ${Date.now() - start}ms`)
})
```

Update the bootstrap to register it:

```ts
// src/index.ts
import { cli } from '@kidd-cli/core'
import greet from './commands/greet.js'
import { timing } from './middleware/timing.js'

cli({
  name: 'my-app',
  version: '0.1.0',
  middleware: [timing],
  commands: { greet },
})
```

Every command now logs its execution time automatically.

## Add configuration

kidd discovers and validates configuration files using Zod. Define a config schema and use module augmentation to make the types available on `ctx.config`:

```ts
// src/config.ts
import type { ConfigType } from '@kidd-cli/core'
import { z } from 'zod'

export const configSchema = z.object({
  greeting: z.string().default('Hello'),
})

declare module '@kidd-cli/core' {
  interface CliConfig extends ConfigType<typeof configSchema> {}
}
```

Pass the schema to `cli()`:

```ts
// src/index.ts
import { cli } from '@kidd-cli/core'
import greet from './commands/greet.js'
import { timing } from './middleware/timing.js'
import { configSchema } from './config.js'

cli({
  name: 'my-app',
  version: '0.1.0',
  config: { schema: configSchema },
  middleware: [timing],
  commands: { greet },
})
```

Now update the command to read from config:

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
    ctx.logger.success(`${ctx.config.greeting}, ${ctx.args.name}!`)
  },
})
```

kidd will look for `my-app.config.ts`, `my-app.config.js`, `.my-apprc.json`, and other common config file patterns -- all validated against your Zod schema at startup.

## Build for production

Install the kidd CLI tooling as a dev dependency and run the build command:

```bash
pnpm add -D @kidd-cli/cli
kidd build
```

This produces an ESM bundle ready for distribution. See the [Build a CLI](/guides/build-a-cli) guide for standalone binary output and advanced build options.

## Next steps

- [Build a CLI](/guides/build-a-cli) -- middleware, config, autoloading, and sub-exports
- [Lifecycle](/concepts/lifecycle) -- how commands, middleware, and context fit together
- [Add Authentication](/guides/add-authentication) -- auth middleware and token storage
