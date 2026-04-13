# Introduction

kidd is an opinionated CLI framework for Node.js. It gives you typed commands, middleware pipelines, configuration loading, authentication, and terminal UI out of the box -- so you can focus on what your CLI does, not how it's wired together.

## Prerequisites

- **Node.js 24+** -- kidd targets the current LTS release
- **pnpm** (recommended) -- any package manager works, but kidd tooling assumes pnpm
- **TypeScript** -- kidd relies on Zod inference and module augmentation, so TypeScript is required

## Why kidd?

- **Convention over configuration** -- sensible defaults for commands, config discovery, and project layout
- **End-to-end type safety** -- Zod schemas for args and config, module augmentation for global types, typed context in every handler
- **Middleware pipelines** -- composable onion model for auth, logging, timing, and any cross-cutting concern
- **Built-in auth** -- OAuth PKCE, device code, env vars, file tokens, and interactive login with zero boilerplate
- **Terminal UI** -- logger, spinner, prompts, colors, and formatters all on `ctx`

## Project structure

A typical kidd project looks like this:

```
my-cli/
├── src/
│   ├── index.ts          # CLI entrypoint
│   ├── config.ts         # Config schema + module augmentation
│   ├── commands/
│   │   ├── deploy.ts     # Command definition
│   │   └── status.ts     # Command definition
│   └── middleware/
│       └── require-auth.ts
├── kidd.config.ts        # Build configuration
├── package.json
└── tsconfig.json
```

Commands live in `src/commands/`, middleware in `src/middleware/`, and the entrypoint ties them together with a single `cli()` call. The build configuration in `kidd.config.ts` controls how `@kidd-cli/cli` bundles your project for distribution.

## Feature matrix

| Feature              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| Typed commands       | Zod schemas for args with full inference             |
| Middleware pipelines | Composable onion model for cross-cutting concerns    |
| Config discovery     | Automatic file loading with Zod validation           |
| Authentication       | OAuth PKCE, device code, env vars, file tokens       |
| Terminal UI          | Logger, spinner, prompts, colors, formatters         |
| HTTP client          | Typed fetch wrapper with auth header injection       |
| Icons                | Nerd Font glyphs with emoji fallback                 |
| Build & compile      | ESM bundling via tsdown, standalone binaries via Bun |

## Sub-exports

The `@kidd-cli/core` package exposes focused sub-exports so you only import what you need:

| Export                    | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `@kidd-cli/core`          | Commands, middleware, context, module augmentation |
| `@kidd-cli/core/config`   | Config middleware and loading                      |
| `@kidd-cli/core/auth`     | Auth middleware and credential strategies          |
| `@kidd-cli/core/http`     | HTTP client middleware                             |
| `@kidd-cli/core/figures`  | Unicode symbols with terminal fallback            |
| `@kidd-cli/core/icons`    | Nerd Font icon middleware                          |
| `@kidd-cli/core/report`   | Structured reporting middleware                    |
| `@kidd-cli/core/test`     | Test utilities for commands and middleware         |
| `@kidd-cli/core/ui`       | Screen commands and UI components                 |
| `@kidd-cli/core/stories`  | Component story definitions                        |

## Packages

| Package                             | Description                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| [`@kidd-cli/core`](/reference/packages/kidd) | Commands, middleware, config, context, auth, HTTP, and icons |
| [`@kidd-cli/cli`](/reference/packages/cli)   | Scaffolding, building, diagnostics, and code generation      |

## Next steps

- [Quick Start](/docs/quick-start) -- build and run a CLI in 5 minutes
- [Build a CLI](/guides/build-a-cli) -- the full guide to commands, middleware, config, and sub-exports
- [Lifecycle](/docs/concepts/lifecycle) -- how a CLI invocation flows from argv to exit
