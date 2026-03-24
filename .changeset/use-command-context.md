---
'@kidd-cli/core': minor
---

Replace `useConfig()`, `useMeta()`, and `useStore()` screen hooks with a single `useCommandContext()` hook that exposes the full command `Context`, including middleware-decorated properties like `auth` and `http`. Remove internal `KiddProvider`, `KiddProviderProps`, `ScreenRenderProps`, `render`, `Instance`, and `RenderOptions` from the public UI exports.
