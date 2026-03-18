# Introduction

kidd is an opinionated CLI framework for Node.js. It gives you typed commands, middleware pipelines, configuration loading, authentication, and terminal UI out of the box -- so you can focus on what your CLI does, not how it's wired together.

## Why kidd?

- **Convention over configuration** -- sensible defaults for commands, config discovery, and project layout
- **End-to-end type safety** -- Zod schemas for args and config, module augmentation for global types, typed context in every handler
- **Middleware pipelines** -- composable onion model for auth, logging, timing, and any cross-cutting concern
- **Built-in auth** -- OAuth PKCE, device code, env vars, file tokens, and interactive login with zero boilerplate
- **Terminal UI** -- logger, spinner, prompts, colors, and formatters all on `ctx`

## Packages

| Package | Description |
| --- | --- |
| [`@kidd-cli/core`](/reference/kidd) | Commands, middleware, config, context, auth, HTTP, and icons |
| [`@kidd-cli/cli`](/reference/cli) | Scaffolding, building, diagnostics, and code generation |

## Next steps

- [Quick Start](/getting-started/quick-start) -- build and run a CLI in 5 minutes
- [Build a CLI](/guides/build-a-cli) -- the full guide to commands, middleware, config, and sub-exports
- [Lifecycle](/concepts/lifecycle) -- how a CLI invocation flows from argv to exit
