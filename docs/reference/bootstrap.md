# cli()

Bootstrap and run a CLI application. Registers commands, parses arguments, loads config, runs middleware, and invokes the matched handler.

Import from `@kidd-cli/core`.

```ts
import { cli } from '@kidd-cli/core'

cli({
  name: 'my-app',
  version: '1.0.0',
  description: 'My CLI tool',
  commands: { deploy, migrate },
  middleware: [timing],
  config: { schema: MyConfigSchema },
  help: {
    header: 'my-app - deploy and migrate with ease',
    footer: 'Docs: https://my-app.dev',
    order: ['deploy', 'migrate'],
  },
  dirs: { local: '.my-app', global: '.my-app' },
})
```

## CliOptions

| Field         | Type                                                            | Default | Description                                   |
| ------------- | --------------------------------------------------------------- | ------- | --------------------------------------------- |
| `name`        | `string`                                                        | --      | CLI name (used for help and config discovery) |
| `version`     | `string`                                                        | --      | CLI version                                   |
| `description` | `string`                                                        | --      | Human-readable description                    |
| `commands`    | `string \| CommandMap \| Promise<CommandMap> \| CommandsConfig` | --      | Commands source                               |
| `middleware`  | `Middleware[]`                                                  | --      | Root middleware stack                         |
| `config`      | `CliConfigOptions`                                              | --      | Config schema and file name override          |
| `help`        | `HelpOptions`                                                   | --      | Custom help output (header, footer, order)    |
| `dirs`        | `DirsConfig`                                                    | --      | Directory name overrides                      |
| `log`         | `Log`                                                           | --      | Custom log implementation                     |
| `prompts`     | `Prompts`                                                       | --      | Custom prompts implementation                 |
| `spinner`     | `Spinner`                                                       | --      | Custom spinner implementation                 |

## CliConfigOptions

| Field    | Type      | Default             | Description                                      |
| -------- | --------- | ------------------- | ------------------------------------------------ |
| `schema` | `ZodType` | --                  | Zod schema to validate the loaded config         |
| `name`   | `string`  | Derived from `name` | Override the config file name for file discovery |

## HelpOptions

Used at both the CLI level (`cli({ help })`) and per-command level (`command({ help })`).

| Field    | Type               | Description                                                                            |
| -------- | ------------------ | -------------------------------------------------------------------------------------- |
| `header` | `string`           | Text displayed above help output when the CLI is invoked without a command             |
| `footer` | `string`           | Text displayed below help output on all help screens (e.g., docs URL, bug report link) |
| `order`  | `readonly string[]` | Display order for subcommands — listed names appear first, rest sort alphabetically    |

## DirsConfig

Overrides directory names for file-backed stores (auth credentials, config). Both default to `.<name>` when omitted.

| Field    | Type     | Default   | Description                                                            |
| -------- | -------- | --------- | ---------------------------------------------------------------------- |
| `local`  | `string` | `.<name>` | Directory name for project-local resolution (`<project-root>/<local>`) |
| `global` | `string` | `.<name>` | Directory name for global resolution (`~/<global>`)                    |

## Commands option

The `commands` field accepts several forms:

| Form                  | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `CommandMap`          | Static object mapping command names to command definitions         |
| `Promise<CommandMap>` | Async-resolved command map                                         |
| `string`              | Directory path -- triggers autoloading from that directory         |
| `CommandsConfig`      | Structured config with `path` for autoloading from a directory     |
| _(omitted)_           | Loads `kidd.config.ts` and autoloads from its `commands` field     |

## defineConfig()

Helper for defining a `kidd.config.ts` file with type checking:

```ts
import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  build: { out: 'dist' },
})
```

## Module augmentation

Extend kidd's interfaces via TypeScript declaration merging for project-wide type safety:

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

| Interface   | Affects      | Description                                                                                 |
| ----------- | ------------ | ------------------------------------------------------------------------------------------- |
| `KiddArgs`  | `ctx.args`   | Global args merged into every command's args                                                |
| `CliConfig` | `ctx.config` | Global config merged into every command's config                                            |
| `KiddStore` | `ctx.store`  | Global store keys merged into the store type                                                |
| `StoreMap`  | `ctx.store`  | The store's full key-value shape -- extend to register typed keys (merges with `KiddStore`) |

## Sub-exports

| Export                   | Purpose                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@kidd-cli/core/config`  | Config loading and validation (`createConfigClient`)                                                                                                  |
| `@kidd-cli/core/store`   | File-backed JSON store (`createStore`)                                                                                                                |
| `@kidd-cli/core/project` | Git root resolution, path utilities (`findProjectRoot`, `isInSubmodule`, `getParentRepoRoot`, `resolvePath`, `resolveLocalPath`, `resolveGlobalPath`) |
| `@kidd-cli/core/format`  | Standalone format functions (`formatCheck`, `formatFinding`, `formatCodeFrame`, `formatTally`, `formatDuration`)                                      |
| `@kidd-cli/core/auth`    | Auth middleware, credential types, strategies (`auth`)                                                                                                |
| `@kidd-cli/core/http`    | Typed HTTP client middleware (`http`, `createHttpClient`)                                                                                             |
| `@kidd-cli/core/icons`   | Icon detection and font middleware (`icons`)                                                                                                          |
| `@kidd-cli/core/report`  | Structured reporting middleware (`report`, `createReport`)                                                                                            |
| `@kidd-cli/core/test`    | Test utilities (`createTestContext`, `runCommand`, `runMiddleware`, `runHandler`)                                                                     |
| `@kidd-cli/core/ui`      | Screen commands and UI components (`screen`, `Box`, `Text`, `Select`, `useConfig`, `useMeta`, `useStore`)                                             |

## References

- [command()](./command.md)
- [middleware()](./middleware.md)
- [screen()](./screen.md)
- [Configuration](../concepts/configuration.md)
- [Lifecycle](../concepts/lifecycle.md)
