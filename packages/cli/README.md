# @kidd-cli/cli

DX companion CLI for the kidd framework. Provides scaffolding, build tooling, a dev server, and diagnostics for kidd-based CLI projects.

## Installation

```bash
pnpm add -D @kidd-cli/cli
```

This package installs the `kidd` binary.

## Commands

### `kidd init`

Scaffold a new kidd CLI project with a recommended directory structure, config file, and starter command.

```bash
kidd init
```

### `kidd build`

Bundle your CLI using tsdown. Reads `kidd.config.ts` for entry point, output directory, and compile targets.

```bash
kidd build
kidd build --compile    # produce standalone binaries
```

### `kidd dev`

Start a dev server that watches for changes and rebuilds automatically.

```bash
kidd dev
```

### `kidd commands`

List all registered commands in the project.

```bash
kidd commands
```

### `kidd doctor`

Run diagnostics to verify your project setup, dependencies, and configuration.

```bash
kidd doctor
```

### `kidd stories`

Launch the stories viewer TUI for browsing and previewing component stories in the terminal. Discovers `.stories.tsx` files in the project and renders them with an interactive props editor.

```bash
kidd stories
kidd stories --include "src/components/**/*.stories.tsx"
```

## Configuration

The CLI reads from `kidd.config.ts` in your project root:

```ts
import { defineConfig } from '@kidd-cli/core'

export default defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
  build: {
    out: './dist',
    target: 'node18',
    minify: false,
  },
  compile: {
    targets: ['darwin-arm64', 'linux-x64'],
  },
})
```

## License

MIT -- [GitHub](https://github.com/joggrdocs/kidd)
