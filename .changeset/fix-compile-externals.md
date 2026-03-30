---
'@kidd-cli/bundler': minor
'@kidd-cli/core': minor
---

fix(bundler): bundle all deps in compile mode to prevent bun compile failures

`bun build --compile` re-bundles the input and errors when it can't resolve an import — even in dead code behind runtime guards. Previously, third-party deps like `ink` and `react` were left as external imports by tsdown, so bun compile would trace into `node_modules` and hit unresolvable optional deps (e.g. `react-devtools-core`, `node-fetch-native`).

When `compile: true`, tsdown now inlines all dependencies (`alwaysBundle: [/./]`) so the bundled output is fully self-contained. A stub plugin replaces known optional/conditional deps (`chokidar`, `magicast`, `giget`, `react-devtools-core`) with empty modules during the tsdown phase, preventing resolution failures when inlining. User-defined externals and Node.js builtins are still honored.

Also replaced the dynamic `import.meta.resolve` + `await import()` hack in `InputBarrier` with a static import of `ink/build/components/StdinContext.js`.
