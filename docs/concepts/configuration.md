# Configuration

The configuration system for kidd CLIs. Supports multiple file formats, automatic discovery, Zod schema validation, and a typed config client API.

## Supported Formats

| Format | Extensions | Notes              |
| ------ | ---------- | ------------------ |
| JSONC  | `.jsonc`   | JSON with comments |
| JSON   | `.json`    | Standard JSON      |
| YAML   | `.yaml`    | YAML format        |

Config files are named `.<name>.jsonc`, `.<name>.json`, or `.<name>.yaml`, where `<name>` is the CLI name passed to `cli({ name })` or `createConfigClient({ name })`.

## `defineConfig()`

Type-safe helper for `kidd.config.ts`. Used by the `@kidd-cli/cli` build system.

```ts
import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  entry: './index.ts',
  commands: './commands',
  build: {
    out: './dist',
    target: 'node18',
    minify: false,
    sourcemap: true,
  },
  compile: {
    targets: ['darwin-arm64', 'linux-x64'],
    name: 'my-cli',
  },
})
```

## CLI Config Options

The `config` option in `cli()` controls how runtime configuration is loaded and validated for your CLI's users.

```ts
cli({
  name: 'my-app',
  version: '1.0.0',
  config: {
    schema: MyConfigSchema,
    name: 'myapp',
  },
  commands: { deploy },
})
```

| Field    | Type      | Default             | Description                                                         |
| -------- | --------- | ------------------- | ------------------------------------------------------------------- |
| `schema` | `ZodType` | --                  | Zod schema to validate the loaded config. Infers `ctx.config` type. |
| `name`   | `string`  | Derived from `name` | Override the config file name for file discovery                    |

## Typing `ctx.config`

The Zod schema validates config at runtime, but TypeScript cannot automatically propagate the schema type to `ctx.config` in command handlers (commands are defined in separate files and dynamically imported). Use `ConfigType` with module augmentation to get compile-time safety:

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

This keeps the schema as the single source of truth — `CliConfig` is always derived from it, so they can never drift apart. Every command handler now sees `ctx.config.apiUrl` and `ctx.config.org` as fully typed properties.

You can scaffold this setup automatically:

- **New projects:** `kidd init --config`
- **Existing projects:** `kidd add config`

## Config Client

The `createConfigClient` factory (from `kidd/config`) provides a standalone API for loading, finding, and writing config files outside of the `cli()` bootstrap.

```ts
import { createConfigClient } from '@kidd-cli/core/config'

const config = createConfigClient({
  name: 'my-app',
  schema: MySchema,
  searchPaths: ['./config'],
})
```

### `ConfigOptions`

| Field         | Type       | Description                                                    |
| ------------- | ---------- | -------------------------------------------------------------- |
| `name`        | `string`   | Config file name (e.g. `'my-app'` resolves to `.my-app.jsonc`) |
| `schema`      | `ZodType`  | Zod schema for validation                                      |
| `searchPaths` | `string[]` | Additional directories to search                               |

### `config.find(cwd?)`

Find the config file path without loading it.

```ts
const filePath = await config.find()
```

Returns `string | null`.

### `config.load(cwd?)`

Load and validate a config file. Returns a Result tuple.

```ts
const result = await config.load()
```

| Return value                           | Meaning                           |
| -------------------------------------- | --------------------------------- |
| `[error, null]`                        | Load or validation failed         |
| `[null, { config, filePath, format }]` | Successfully loaded and validated |
| `[null, null]`                         | No config file found              |

### `config.write(data, options?)`

Validate and write config data to a file.

```ts
const [error, result] = await config.write(
  { apiUrl: 'https://api.example.com' },
  { format: 'jsonc' }
)
```

| Option     | Type           | Description                                   |
| ---------- | -------------- | --------------------------------------------- |
| `dir`      | `string`       | Target directory (defaults to cwd)            |
| `format`   | `ConfigFormat` | Output format (`'jsonc'`, `'json'`, `'yaml'`) |
| `filePath` | `string`       | Explicit output path (overrides `dir`)        |

## Discovery Order

When `config.load()` or `config.find()` is called, files are searched in this order:

1. Custom `searchPaths` (if provided)
2. Current working directory
3. Git repository root

The first matching file wins. Files are checked in extension order: `.jsonc`, `.json`, `.yaml`.

## References

- [kidd API Reference](../reference/kidd.md)
- [Context](./context.md)
- [@kidd-cli/cli Reference](../reference/cli.md)
