# Add a Package

Add a new package to the kidd monorepo end-to-end: scaffold, configure, build, test, and register.

## Prerequisites

- Local environment set up (see [Getting Started](./getting-started.md))
- Understanding of the [architecture](../concepts/architecture.md)

## Steps

### 1. Create the package directory

Create a new directory under `packages/`:

```bash
mkdir -p packages/<name>/src
```

The workspace file (`pnpm-workspace.yaml`) already includes `packages/*`, so the new package is automatically registered.

### 2. Create package.json

Create `packages/<name>/package.json` with the `@kidd-cli/` scope:

```json
{
  "name": "@kidd-cli/<name>",
  "version": "0.1.0",
  "description": "Brief description of the package",
  "keywords": ["cli", "kidd"],
  "homepage": "https://github.com/joggrdocs/kidd/tree/main/packages/<name>",
  "bugs": {
    "url": "https://github.com/joggrdocs/kidd/issues"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/joggrdocs/kidd.git",
    "directory": "packages/<name>"
  },
  "files": ["dist"],
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsgo --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "catalog:",
    "tsdown": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "engines": {
    "bun": ">=1.3",
    "node": ">=24"
  }
}
```

Use `catalog:` references from `pnpm-workspace.yaml` for shared dependencies (`vitest`, `tsdown`, `typescript`, `ts-pattern`, `es-toolkit`, `zod`).

### 3. Create tsconfig.json

Create `packages/<name>/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "isolatedDeclarations": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 4. Create tsdown.config.ts

Create `packages/<name>/tsdown.config.ts`:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  fixedExtension: false,
  outDir: 'dist',
  entry: {
    index: 'src/index.ts',
  },
  format: 'esm',
})
```

Add entries to both `entry` and `package.json` `exports` for each subpath the package exposes.

### 5. Create the entry file

Create `packages/<name>/src/index.ts` with the initial exports:

```ts
export function placeholder(): string {
  return 'hello'
}
```

### 6. Install dependencies

Run install from the repo root to link the new package:

```bash
pnpm install
```

### 7. Verify the build

```bash
pnpm build --filter=@kidd-cli/<name>
```

Confirm `dist/` is generated with `.js` and `.d.ts` files.

### 8. Add to other packages (if needed)

To depend on the new package from another package, add a workspace reference:

```json
"dependencies": {
  "@kidd-cli/<name>": "workspace:*"
}
```

Then run `pnpm install` again.

### 9. Write tests

Create test files colocated with source at `packages/<name>/src/**/*.test.ts`. Follow the [testing standards](../standards/typescript/testing.md).

### 10. Add a changeset

```bash
pnpm changeset
```

Select the new package, choose `minor` for the initial release, and describe the addition.

## Verification

After completing all steps:

1. Run `pnpm build --filter=@kidd-cli/<name>` and confirm `dist/` is generated
2. Run `pnpm typecheck --filter=@kidd-cli/<name>` and confirm no errors
3. Run `pnpm test --filter=@kidd-cli/<name>` and confirm tests pass
4. Run `pnpm check` from the root and confirm the full suite passes

## Troubleshooting

### Package not found by other workspace packages

**Issue:** `Cannot find module '@kidd-cli/<name>'` when importing from another package.

**Fix:** Ensure the dependency is listed as `"@kidd-cli/<name>": "workspace:*"` in the consuming package's `package.json` and run `pnpm install`.

### Build fails with missing entry

**Issue:** `tsdown` reports an entry point not found.

**Fix:** Verify the `entry` paths in `tsdown.config.ts` match existing files under `src/`. The keys are output names, the values are source file paths.

### TypeScript errors from catalog references

**Issue:** Type mismatches caused by different dependency versions across packages.

**Fix:** Use `catalog:` references in `package.json` for all shared dev dependencies. Check `pnpm-workspace.yaml` for available catalog entries.

## References

- [Getting Started](./getting-started.md)
- [Architecture](../concepts/architecture.md)
- [Coding Style](../standards/typescript/coding-style.md)
- [Develop a Feature](./developing-a-feature.md)
