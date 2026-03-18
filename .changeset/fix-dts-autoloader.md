---
'@kidd-cli/core': patch
'@kidd-cli/bundler': patch
---

fix(packages/core,packages/bundler): exclude .d.ts files from command autoloader

The `isCommandFile` and `findIndexEntry` functions used `extname()` to check
file extensions, but `extname('build.d.ts')` returns `'.ts'`, causing `.d.ts`
declaration files to pass the filter. When `@kidd-cli/cli` is installed under
`node_modules` and its `dist/commands/` directory contains `.d.ts` files, the
runtime autoloader attempts to `import()` them, triggering a Node 24 type
stripping error for files under `node_modules`.
