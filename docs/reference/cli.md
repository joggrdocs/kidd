# @kidd-cli/cli

DX companion CLI for kidd projects. Provides scaffolding, building, diagnostics, and code generation commands.

## Installation

```bash
pnpm add -D @kidd-cli/cli
```

## Commands

### `kidd init`

Scaffold a new kidd CLI project. Prompts for project details interactively or accepts them as flags.

```bash
kidd init
kidd init --name my-cli --pm pnpm --example
```

| Flag            | Type                        | Description                      |
| --------------- | --------------------------- | -------------------------------- |
| `--name`        | `string`                    | Project name (kebab-case)        |
| `--description` | `string`                    | Project description              |
| `--pm`          | `'pnpm' \| 'yarn' \| 'npm'` | Package manager                  |
| `--example`     | `boolean`                   | Include an example hello command |

### `kidd build`

Bundle a kidd CLI project for production using tsdown. Optionally compile to standalone binaries via Bun.

```bash
kidd build
kidd build --compile
kidd build --targets darwin-arm64 linux-x64
```

| Flag        | Type       | Description                                     |
| ----------- | ---------- | ----------------------------------------------- |
| `--compile` | `boolean`  | Compile to standalone binaries after bundling   |
| `--targets` | `string[]` | Cross-compilation targets (implies `--compile`) |

Supported compile targets: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `linux-x64-musl`, `windows-x64`, `windows-arm64`.

Build options can also be configured in `kidd.config.ts`:

```ts
import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  entry: './index.ts',
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

### `kidd dev`

Start a kidd CLI project in development mode. Loads the project's `kidd.config.ts`, starts tsdown in watch mode, and logs rebuild status on each file change.

```bash
kidd dev
```

On the first successful build the spinner stops and a "watching" message is logged. Subsequent rebuilds log a success message. Build options are read from `kidd.config.ts` (all fields are optional — defaults apply when no config file is found).

### `kidd doctor`

Diagnose common project issues. Validates config, checks `package.json` setup, verifies entry points, and catches anything that could cause build or runtime failures.

```bash
kidd doctor
kidd doctor --fix
```

| Flag    | Type      | Description                    |
| ------- | --------- | ------------------------------ |
| `--fix` | `boolean` | Auto-fix issues where possible |

### `kidd add command`

Add a new command to an existing kidd project. Detects the project root and generates a command file in the configured commands directory.

```bash
kidd add command
kidd add command --name deploy --description "Deploy the app" --args
```

| Flag            | Type      | Description               |
| --------------- | --------- | ------------------------- |
| `--name`        | `string`  | Command name (kebab-case) |
| `--description` | `string`  | Command description       |
| `--args`        | `boolean` | Include a Zod args schema |

### `kidd add middleware`

Add a new middleware to an existing kidd project. Generates a middleware file in `src/middleware/`.

```bash
kidd add middleware
kidd add middleware --name auth --description "Require authentication"
```

| Flag            | Type     | Description                  |
| --------------- | -------- | ---------------------------- |
| `--name`        | `string` | Middleware name (kebab-case) |
| `--description` | `string` | Middleware description       |

### `kidd add config`

Scaffold a config schema with Zod validation and `ConfigType` module augmentation in an existing kidd project. Creates `src/config.ts` with a starter schema and wires up the `declare module` augmentation.

```bash
kidd add config
```

This generates:

```ts
// src/config.ts
import type { ConfigType } from '@kidd-cli/core'
import { z } from 'zod'

export const configSchema = z.object({
  // Add your config fields here
})

declare module '@kidd-cli/core' {
  interface CliConfig extends ConfigType<typeof configSchema> {}
}
```

### `kidd commands`

Display the command tree for a kidd CLI project. Scans the configured commands directory and prints an ASCII tree of all discovered commands and subcommands.

```bash
kidd commands
```

## Workflows

### New project from scratch

```bash
kidd init --name my-cli --pm pnpm --example
cd my-cli
pnpm install
kidd dev
```

### Add features to an existing project

```bash
kidd add command --name deploy --description "Deploy the app" --args
kidd add middleware --name require-auth --description "Require authentication"
kidd add config
```

### Production build

```bash
kidd build
kidd build --compile --targets darwin-arm64 linux-x64
```

### Diagnose issues

```bash
kidd doctor
kidd doctor --fix
kidd commands
```

## References

- [@kidd-cli/core API Reference](./kidd.md)
- [Build a CLI](../guides/build-a-cli.md)
- [Configuration](../concepts/configuration.md)
