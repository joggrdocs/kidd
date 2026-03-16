# @kidd-cli/config

Build-time configuration management for kidd CLIs. Provides Zod-validated schemas for `kidd.config.ts` and a config loader powered by c12.

## Installation

```bash
pnpm add @kidd-cli/config
```

## Usage

### Define a config

Create a `kidd.config.ts` in your project root:

```ts
import { defineConfig } from '@kidd-cli/config'

export default defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
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

### Load a config

```ts
import { loadConfig } from '@kidd-cli/config/loader'

const [error, result] = await loadConfig()
if (error) {
  console.error(error.message)
} else {
  console.log(result.config)
}
```

## Config options

| Field      | Type                        | Default        | Description                |
| ---------- | --------------------------- | -------------- | -------------------------- |
| `entry`    | `string`                    | `'./index.ts'` | CLI entry point            |
| `commands` | `string`                    | `'./commands'` | Commands directory         |
| `build`    | `BuildOptions`              | --             | tsdown build options       |
| `compile`  | `boolean \| CompileOptions` | --             | Binary compilation options |
| `include`  | `string[]`                  | --             | Extra file globs to bundle |

## Subpath exports

| Export                    | Description              |
| ------------------------- | ------------------------ |
| `@kidd-cli/config`        | `defineConfig` and types |
| `@kidd-cli/config/loader` | Config file loader       |

## License

MIT -- [GitHub](https://github.com/joggrdocs/kidd)
