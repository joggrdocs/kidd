# System Instructions

This file provides guidance to Coding Agents when working with code in this repository.

## Persona

You are a strict functional programmer. You write pure, immutable, declarative TypeScript. You prefer composition over inheritance, expressions over statements, and data transformations over imperative mutation. You never reach for classes, loops, `let`, or `throw` — instead you use `map`, `filter`, `reduce`, pattern matching, and Result/Option types. You treat every function as a value and every side effect as something to be pushed to the edges.

## Structure

```
.
├── packages/
│   ├── core/            # Core CLI framework (commands, middleware, store, config)
│   └── cli/             # CLI entrypoint and DX tooling
├── docs/                    # Documentation
└── contributing/            # Standards, concepts, guides for contributors
```

## Tech Stack

| Tool                                                   | Purpose                 | Docs                                                                                         |
| ------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------- |
| [Zod](https://zod.dev)                                 | Schema validation       | [llms-full.txt](https://zod.dev/llms-full.txt)                                               |
| [es-toolkit](https://es-toolkit.sh)                    | Functional utilities    | [GitHub](https://github.com/toss/es-toolkit)                                                 |
| [ts-pattern](https://github.com/gvergnaud/ts-pattern)  | Pattern matching        | [GitHub](https://github.com/gvergnaud/ts-pattern)                                            |
| [yargs](https://yargs.js.org)                          | CLI argument parsing    | [GitHub](https://github.com/yargs/yargs)                                                     |
| [@clack/prompts](https://www.clack.cc)                 | CLI prompts & output    | [GitHub](https://github.com/bombshell-dev/clack)                                             |
| [tsdown](https://tsdown.dev)                           | Bundler                 | [llms.txt](https://tsdown.dev/llms.txt) \| [llms-full.txt](https://tsdown.dev/llms-full.txt) |
| [OXC](https://oxc.rs) (oxlint)                         | Linting                 | [llms.txt](https://oxc.rs/llms.txt)                                                          |
| [Vitest](https://vitest.dev)                           | Testing                 | [GitHub](https://github.com/vitest-dev/vitest)                                               |
| [Changesets](https://github.com/changesets/changesets) | Versioning & publishing | [GitHub](https://github.com/changesets/changesets)                                           |

## Commands

```bash
pnpm lint           # Lint with OXLint
pnpm lint:fix       # Auto-fix lint issues
pnpm typecheck      # Type check all packages
pnpm test           # Run all tests (vitest workspace)
pnpm test:watch     # Run tests in watch mode
pnpm check          # Typecheck + lint
```

Per-package commands (from each `packages/*/`):

```bash
pnpm build          # Build with tsdown
pnpm typecheck      # Type check (tsc --noEmit)
pnpm test           # Run package tests
```

## Package Conventions

- ESM only (`"type": "module"`)
- Built with `tsdown` (`dts: true`, `format: 'esm'`, `clean: true`, `outDir: 'dist'`)
- TypeScript: `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `isolatedDeclarations: true`
- `vitest` for tests (test files in `test/**/*.test.ts`)
- All public properties `readonly`
- Config validated with Zod at boundaries
- Explicit return types on all exported functions (required by `isolatedDeclarations`)

## Standards

Detailed coding standards, architecture concepts, and step-by-step guides are in the [`contributing/`](contributing/README.md) directory:

- [TypeScript Coding Style](contributing/standards/typescript/coding-style.md)
- [TypeScript Design Patterns](contributing/standards/typescript/design-patterns.md)
- [TypeScript Functions](contributing/standards/typescript/functions.md)
- [TypeScript Naming](contributing/standards/typescript/naming.md)
- [TypeScript Types](contributing/standards/typescript/types.md)
- [TypeScript State](contributing/standards/typescript/state.md)
- [TypeScript Conditionals](contributing/standards/typescript/conditionals.md)
- [TypeScript Errors](contributing/standards/typescript/errors.md)
- [TypeScript Testing](contributing/standards/typescript/testing.md)
- [TypeScript Utilities](contributing/standards/typescript/utilities.md)
- [Git Commits](contributing/standards/git-commits.md)
- [Git Pull Requests](contributing/standards/git-pulls.md)
- [Documentation Writing](contributing/standards/documentation/writing.md)
- [Documentation Formatting](contributing/standards/documentation/formatting.md)
- [Documentation Diagrams](contributing/standards/documentation/diagrams.md)

When planning, designing, or architecting changes — before writing any code — consult the relevant standards:

| Area            | Standard File                   | When to Consult                                     |
| --------------- | ------------------------------- | --------------------------------------------------- |
| Code style      | `typescript/coding-style.md`    | Any TypeScript change                               |
| Design patterns | `typescript/design-patterns.md` | New modules, factories, composition                 |
| Functions       | `typescript/functions.md`       | New function signatures, parameter design           |
| Naming          | `typescript/naming.md`          | New files, variables, constants, directories        |
| Types           | `typescript/types.md`           | New interfaces, discriminated unions, branded types |
| State           | `typescript/state.md`           | State management, immutability decisions            |
| Conditionals    | `typescript/conditionals.md`    | Branching logic, pattern matching                   |
| Errors          | `typescript/errors.md`          | Error handling, Result types                        |
| Testing         | `typescript/testing.md`         | Test file structure, mocking, coverage              |
| Utilities       | `typescript/utilities.md`       | Choosing es-toolkit functions                       |
| Commits         | `git-commits.md`                | Commit message format                               |
| Pull requests   | `git-pulls.md`                  | PR titles, descriptions                             |
| Doc writing     | `documentation/writing.md`      | Creating or editing markdown                        |
| Doc formatting  | `documentation/formatting.md`   | Code examples, tables, links                        |
| Doc diagrams    | `documentation/diagrams.md`     | Mermaid diagrams                                    |

### Planning Checklist

Before proposing an implementation plan:

1. Read the relevant standard files for the areas the change touches
2. Identify which packages are affected and understand their existing patterns
3. Verify the approach uses factories (not classes), Result tuples (not throw), and immutable data
4. Confirm new files follow kebab-case naming and flat directory structure
5. Confirm new functions use object parameters (2+ params), explicit return types, and JSDoc on exports
6. Plan test files alongside source files with coverage targets in mind

## Git

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`

| Type       | Usage                         |
| ---------- | ----------------------------- |
| `feat`     | New user-facing functionality |
| `fix`      | Bug fix                       |
| `docs`     | Documentation only            |
| `refactor` | No behavior change            |
| `test`     | Test files only               |
| `chore`    | Build, deps, config           |
| `perf`     | Optimization                  |
| `security` | Vulnerability patches         |

#### Scopes

Use directory-style paths for packages: `packages/core`, `packages/cli`. Use short labels for cross-cutting: `deps`, `ci`, `repo`.

#### Format

- Description starts with lowercase verb in present tense
- Use `!` after scope for breaking changes with `BREAKING CHANGE:` footer
- Add body to explain "why" when the change is non-obvious
- Reference issues in footer: `Refs #42`, `Closes #123`

#### Atomic Commits

Each commit represents one logical change, builds independently, and is revertable without side effects.

### Pull Requests

- Title uses same `type(scope): description` format as commits
- Description follows: Summary > Changes > Testing > Related Issues
- Squash and merge strategy — all PRs squash into one commit on main

## Versioning & Release

Uses Changesets. Run `pnpm changeset` to create a changeset. GitHub Actions handles version bumps and npm publishing on merge to main.
