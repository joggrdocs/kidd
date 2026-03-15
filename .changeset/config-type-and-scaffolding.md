---
"@kidd-cli/core": minor
"@kidd-cli/cli": minor
---

Add `ConfigType` utility type and `CliConfig` augmentation interface for typed `ctx.config`.

**@kidd-cli/core:**
- Add `ConfigType<TSchema>` utility type to derive `CliConfig` from a Zod schema
- Rename `KiddConfig` augmentation interface to `CliConfig` to avoid confusion with the build config type in `@kidd-cli/config`
- Export `CliConfig` and `ConfigType` from `@kidd-cli/core`

**@kidd-cli/cli:**
- Add `--config` flag to `kidd init` to scaffold config schema setup during project creation
- Add `kidd add config` command to scaffold config into existing projects
- Scaffolded config includes Zod schema with `ConfigType` module augmentation wiring
