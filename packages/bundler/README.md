# @kidd-cli/bundler

Programmatic bundler for kidd CLI tools powered by tsdown. Handles building, watching, compiling to standalone binaries, and static command autoloading.

## Installation

```bash
pnpm add -D @kidd-cli/bundler
```

## Usage

### Build

Bundle a kidd CLI project. Resolves config from `kidd.config.ts`, injects `__KIDD_VERSION__`, and produces ESM output via tsdown.

```ts
import { build } from '@kidd-cli/bundler'

const [error, output] = await build({ cwd: process.cwd() })
if (error) {
  console.error(error.message)
} else {
  console.log(`Built to ${output.outDir}/${output.entryFile}`)
}
```

### Watch

Start a watch-mode build for development:

```ts
import { watch } from '@kidd-cli/bundler'

await watch({ cwd: process.cwd() })
```

### Compile to standalone binaries

Compile the bundled output into self-contained executables using `bun build --compile`:

```ts
import { compile } from '@kidd-cli/bundler'

const [error, output] = await compile({
  cwd: process.cwd(),
  targets: ['darwin-arm64', 'linux-x64'],
})
```

Supported targets: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `linux-x64-musl`, `windows-x64`, `windows-arm64`.

### Static autoloader plugin

A rolldown/tsdown plugin that replaces the runtime command autoloader with statically resolved imports at build time:

```ts
import { createAutoloadPlugin } from '@kidd-cli/bundler'

const plugin = createAutoloadPlugin({
  commandsDir: './src/commands',
  tagModulePath: '@kidd-cli/utils/tag',
})
```

## Key exports

| Export                     | Description                              |
| -------------------------- | ---------------------------------------- |
| `build`                    | Bundle a kidd CLI project                |
| `watch`                    | Watch-mode build                         |
| `compile`                  | Compile to standalone binaries           |
| `createAutoloadPlugin`     | tsdown plugin for static command loading |
| `scanCommandsDir`          | Scan a directory for command files       |
| `generateStaticAutoloader` | Generate static autoloader source code   |
| `mapToBuildConfig`         | Map kidd config to tsdown InlineConfig   |

## License

MIT -- [GitHub](https://github.com/joggrdocs/kidd)
