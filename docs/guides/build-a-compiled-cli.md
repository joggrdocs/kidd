# Build a Compiled CLI

Bundle and compile a kidd CLI into standalone binaries using `@kidd-cli/bundler`.

## Prerequisites

- An existing kidd CLI project with `@kidd-cli/core`
- Node.js 22+
- Bun installed (required for the compile step)
- `@kidd-cli/bundler` installed (`pnpm add -D @kidd-cli/bundler`)

## Overview

The bundler package provides three operations you compose into a release pipeline:

| Operation | Function  | What it does                                                        |
| --------- | --------- | ------------------------------------------------------------------- |
| Build     | `build()` | Bundles your CLI source into a single ESM file via tsdown           |
| Watch     | `watch()` | Runs the same bundling step in watch mode for local development      |
| Compile   | `compile()` | Compiles the bundled ESM file into self-contained binaries via Bun |

`build()` must run before `compile()`. The autoload plugin is applied automatically during both build and watch.

## Steps

### 1. Create a kidd config file

The bundler reads from a `kidd.config.ts` (or `.js`, `.json`, `.yaml`) file in your project root. All fields are optional — defaults cover the common case.

```ts
// kidd.config.ts
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
    name: 'my-app',
    out: './dist/bin',
    targets: ['darwin-arm64', 'darwin-x64', 'linux-x64', 'windows-x64'],
  },
})
```

### 2. Run a build

Call `build()` with your config and working directory. It resolves defaults, reads your `package.json` version, and invokes tsdown.

```ts
import { build } from '@kidd-cli/bundler'
import { defineConfig } from '@kidd-cli/config'

const config = defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
})

const [error, output] = await build({ config, cwd: process.cwd() })

if (error) {
  console.error('Build failed:', error.message)
  process.exit(1)
}

console.log('Built to:', output.outDir)
console.log('Entry file:', output.entryFile)
```

`build()` returns a `[Error | null, BuildOutput | null]` result tuple. `BuildOutput` contains:

| Field       | Type                | Description                                     |
| ----------- | ------------------- | ----------------------------------------------- |
| `outDir`    | `string`            | Absolute path to the build output directory     |
| `entryFile` | `string`            | Absolute path to the bundled entry file         |
| `version`   | `string\|undefined` | Version read from `package.json`, if available  |

### 3. Watch for changes

Use `watch()` during development. The returned promise resolves only when tsdown's watcher terminates (on process exit).

```ts
import { watch } from '@kidd-cli/bundler'
import { defineConfig } from '@kidd-cli/config'

const config = defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
})

const [error] = await watch({
  config,
  cwd: process.cwd(),
  onSuccess: () => {
    console.log('Rebuild complete')
  },
})

if (error) {
  console.error('Watch failed:', error.message)
  process.exit(1)
}
```

The optional `onSuccess` callback runs after each successful rebuild.

### 4. Compile to standalone binaries

After a successful build, call `compile()` to produce self-contained executables. This uses `bun build --compile` internally and requires Bun to be installed.

```ts
import { build, compile } from '@kidd-cli/bundler'
import { defineConfig } from '@kidd-cli/config'

const config = defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
  compile: {
    name: 'my-app',
    targets: ['darwin-arm64', 'linux-x64', 'windows-x64'],
  },
})

const cwd = process.cwd()

const [buildError] = await build({ config, cwd })
if (buildError) {
  console.error('Build failed:', buildError.message)
  process.exit(1)
}

const [compileError, output] = await compile({
  config,
  cwd,
  onTargetStart: (target) => console.log(`Compiling ${target}...`),
  onTargetComplete: (target) => console.log(`Done: ${target}`),
})

if (compileError) {
  console.error('Compile failed:', compileError.message)
  process.exit(1)
}

for (const binary of output.binaries) {
  console.log(`${binary.label}: ${binary.path}`)
}
```

`compile()` returns a `[Error | null, CompileOutput | null]` tuple. `CompileOutput` contains:

| Field      | Type                    | Description                             |
| ---------- | ----------------------- | --------------------------------------- |
| `binaries` | `readonly CompiledBinary[]` | One entry per compiled target       |

Each `CompiledBinary` has:

| Field    | Type            | Description                                                  |
| -------- | --------------- | ------------------------------------------------------------ |
| `target` | `CompileTarget` | The target identifier (e.g. `'darwin-arm64'`)               |
| `label`  | `string`        | Human-readable label (e.g. `'macOS Apple Silicon'`)         |
| `path`   | `string`        | Absolute path to the compiled binary                         |

### 5. Use the autoload plugin

When you pass a `commands` path in your config, the bundler automatically applies the `kidd-static-autoloader` rolldown plugin during build and watch. It replaces kidd's runtime autoloader with a static version that pre-resolves all command imports at build time.

You only need the plugin directly if you are constructing a custom tsdown config instead of using `build()` or `watch()`:

```ts
import { createAutoloadPlugin } from '@kidd-cli/bundler'

const plugin = createAutoloadPlugin({
  commandsDir: '/absolute/path/to/src/commands',
  tagModulePath: '/absolute/path/to/kidd/dist/index.js',
})
```

Pass `plugin` into your tsdown `plugins` array. In most cases you should prefer `build()` or `watch()`, which wire this up automatically.

## Configuration reference

All fields in `kidd.config.ts` are optional. The following table lists every supported option with its default.

### Top-level

| Field      | Type                               | Default              | Description                                         |
| ---------- | ---------------------------------- | -------------------- | --------------------------------------------------- |
| `entry`    | `string`                           | `./src/index.ts`     | CLI entrypoint                                      |
| `commands` | `string`                           | `./commands`         | Directory scanned by the autoloader                 |
| `include`  | `string[]`                         | `[]`                 | Additional files to include in the bundle           |

### `build`

| Field      | Type       | Default  | Description                                      |
| ---------- | ---------- | -------- | ------------------------------------------------ |
| `out`      | `string`   | `./dist` | Build output directory                           |
| `target`   | `string`   | `node18` | tsdown/esbuild target                            |
| `minify`   | `boolean`  | `false`  | Minify output                                    |
| `sourcemap`| `boolean`  | `true`   | Generate source maps                             |
| `external` | `string[]` | `[]`     | Additional packages to mark as external          |

### `compile`

Can be `true` (compile with all defaults), `false`/omitted (skip compilation), or an object:

| Field     | Type               | Default                                                     | Description                                     |
| --------- | ------------------ | ----------------------------------------------------------- | ----------------------------------------------- |
| `name`    | `string`           | `cli`                                                       | Output binary name                              |
| `out`     | `string`           | `./dist`                                                    | Compile output directory                        |
| `targets` | `CompileTarget[]`  | `darwin-arm64`, `darwin-x64`, `linux-x64`, `windows-x64`   | Platforms to compile for                        |

#### Supported targets

| Target           | Platform                  |
| ---------------- | ------------------------- |
| `darwin-arm64`   | macOS Apple Silicon       |
| `darwin-x64`     | macOS Intel               |
| `linux-arm64`    | Linux ARM64               |
| `linux-x64`      | Linux x64                 |
| `linux-x64-musl` | Linux x64 (musl/Alpine)   |
| `windows-arm64`  | Windows ARM64             |
| `windows-x64`    | Windows x64               |

## Example: release script

A typical release script builds for all default targets and logs each binary path.

```ts
// scripts/release.ts
import { build, compile } from '@kidd-cli/bundler'
import { defineConfig } from '@kidd-cli/config'

const config = defineConfig({
  entry: './src/index.ts',
  commands: './src/commands',
  compile: {
    name: 'my-app',
    out: './dist/bin',
  },
})

const cwd = process.cwd()

console.log('Building...')
const [buildError, buildOutput] = await build({ config, cwd })
if (buildError) {
  console.error(buildError.message)
  process.exit(1)
}
console.log('Built:', buildOutput.entryFile)

console.log('Compiling...')
const [compileError, compileOutput] = await compile({
  config,
  cwd,
  onTargetStart: (target) => process.stdout.write(`  ${target}... `),
  onTargetComplete: () => console.log('done'),
})
if (compileError) {
  console.error(compileError.message)
  process.exit(1)
}

for (const bin of compileOutput.binaries) {
  console.log(`  ${bin.label}: ${bin.path}`)
}
```

Run it with:

```bash
bun run scripts/release.ts
```

## Verification

```bash
# Build only
node -e "import('@kidd-cli/bundler').then(b => b.build({ config: {}, cwd: process.cwd() }))"

# Test the compiled binary directly
./dist/bin/my-app --help
./dist/bin/my-app-darwin-arm64 --version
```

## Troubleshooting

### `bundled entry not found` error from `compile()`

**Issue:** `compile()` returns `bundled entry not found in ./dist — run build() first`.

**Fix:** Always call `build()` before `compile()`. Confirm `build.out` and `compile.out` resolve to the same directory (or that the build output directory contains `index.mjs` or `index.js`).

### `bun build --compile failed` for a target

**Issue:** Compilation fails for a specific target.

**Fix:** Ensure Bun is installed and up to date (`bun --version`). Cross-compilation requires Bun 1.1+. The `linux-x64-musl` target maps to Bun's standard Linux x64 target — there is no separate musl binary in Bun.

### Autoloader finds no commands

**Issue:** Commands are missing at runtime in the compiled binary.

**Fix:** Verify `commands` in your config points to the directory containing your command files. Each file must export a `command()` call as its default export. The path is resolved relative to the project root (`cwd`), not the source file.

### Build target does not match runtime

**Issue:** The binary crashes with a Node API not found error.

**Fix:** The default `build.target` is `node18`. If your code uses APIs from a newer Node version, set `target` explicitly (e.g., `'node22'`).

## Resources

- [tsdown](https://tsdown.dev)
- [Bun compile](https://bun.sh/docs/bundler/executables)

## References

- [Build a CLI](./build-a-cli.md)
- [Configuration Concepts](../concepts/configuration.md)
