---
'@kidd-cli/utils': minor
---

Replace wildcard re-exports (`export *`) with explicit named exports for `es-toolkit` and `ts-pattern` in the `fp` barrel module, enabling proper tree-shaking in downstream CLI bundles. Previously the entire `es-toolkit` library (193 modules) was bundled even when only 7 functions were used.
