---
'@kidd-cli/cli': patch
---

Sync init template dependency versions from pnpm-workspace.yaml catalog

Replace hardcoded zod, typescript, vitest, and tsdown versions in the init template with liquid variables sourced from a generated constants file. Add a laufen script (`sync-template-versions`) to regenerate the constants from the pnpm catalog, and a test to catch version drift.
