---
'@kidd-cli/bundler': minor
'@kidd-cli/cli': patch
---

Replace tsdown with Bun.build as the bundler backend, running builds via a subprocess runner for improved performance and binary compilation support.

## Migration

### Bun is now required at build time

Previously, only `bun build --compile` (the compile step) required Bun. Now the bundling step itself runs inside a Bun subprocess. Ensure `bun` (v1.3.11+) is installed in all environments where `kidd build` or `kidd dev` runs, including CI pipelines.

If your CI only installs Bun for the compile step, you must now install it earlier so the build step can also use it.

### Output file extension changed from `.mjs` to `.js`

Build output is now `dist/index.js` instead of `dist/index.mjs`. If you have hardcoded references to the `.mjs` extension (e.g., in dev scripts, custom launchers, or import paths), update them to `.js`.

### tsdown is no longer a dependency

The `tsdown` package has been removed from `@kidd-cli/bundler`'s dependencies. If your project relied on tsdown being transitively available through kidd, add it as a direct dependency instead.
