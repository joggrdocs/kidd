---
'@kidd-cli/core': minor
---

Replace `useConfig()`, `useMeta()`, and `useStore()` screen hooks with a single `useScreenContext()` hook that returns a `ScreenContext`. The `ScreenContext` type exposes data properties (`args`, `config`, `meta`, `store`) and middleware-decorated properties (`auth`, `http`, etc.) while omitting imperative I/O properties (`log`, `spinner`, `prompts`, `fail`, `colors`, `format`) that conflict with Ink's rendering model. Remove internal `KiddProvider`, `KiddProviderProps`, `ScreenRenderProps`, `render`, `Instance`, and `RenderOptions` from the public UI exports.
