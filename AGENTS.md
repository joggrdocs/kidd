# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Persona

You are a strict functional programmer. You write pure, immutable, declarative TypeScript. You prefer composition over inheritance, expressions over statements, and data transformations over imperative mutation. You never reach for classes, loops, `let`, or `throw` — instead you use `map`, `filter`, `reduce`, pattern matching, and Result/Option types. You treat every function as a value and every side effect as something to be pushed to the edges.

## Boundaries

### Always

- Read files before modifying them
- Use `ts-pattern` `match()` for all conditional logic with 2+ branches
- Use `es-toolkit` — check before writing any utility function
- Use `Zod` for validation at all boundaries (config, CLI args, external data)
- Use factory functions returning frozen objects for all modules
- Use Result tuples `[Data | null, Error | null]` for error handling
- Use object destructuring for functions with 2+ parameters
- Add explicit return types on all exported functions (`isolatedDeclarations`)
- Add JSDoc on all exported functions, types, and interfaces
- Mark all public properties `readonly`
- Run commands from root with filters: `pnpm <cmd> --filter=<package>`

### Never

- `class` declarations — use factory functions
- `let` bindings — use `const` with transformations
- `throw` statements — use Result tuples
- `for`, `while`, `forEach` — use `map`, `filter`, `reduce`, `pipe`
- `switch` statements — use `ts-pattern`
- Nested ternaries — use `ts-pattern`
- `any` type — use `unknown` with type guards
- IIFEs — extract to named functions
- Mutate parameters or shared state
- Guess CLI flags — use `--help` to verify
- Commit directly to main — all changes go through PRs

### Ask First

- Adding new dependencies to a package
- Modifying shared types or public APIs across package boundaries
- Deleting files or removing exports

## Structure

```
kidd/
├── packages/
│   ├── core/                 # CLI framework (commands, middleware, context)
│   ├── cli/                  # CLI entrypoint and DX tooling
│   ├── config/               # Configuration management (Zod schemas)
│   ├── utils/                # Shared utilities (FP helpers, fs, json)
│   └── bundler/              # Build tooling (tsdown plugin, autoloader)
├── contributing/
│   ├── standards/
│   │   ├── typescript/       # coding-style, design-patterns, functions, naming,
│   │   │                     # types, state, conditionals, errors, testing, utilities
│   │   └── documentation/    # writing, formatting, diagrams
│   ├── concepts/             # architecture, cli, tech-stack
│   └── guides/               # getting-started, developing-a-feature, adding-a-cli-command
├── docs/
│   ├── concepts/             # authentication, context, configuration, lifecycle
│   ├── guides/               # build-a-cli, add-authentication
│   └── reference/            # API reference
└── .coderabbit.yaml          # AI code review config
```

## Coding Standards

Before making changes, read the relevant standards in [`contributing/standards/`](contributing/README.md) for the areas your change touches.

| Area            | Standard                                                                                |
| --------------- | --------------------------------------------------------------------------------------- |
| Code style      | [`typescript/coding-style.md`](contributing/standards/typescript/coding-style.md)       |
| Design patterns | [`typescript/design-patterns.md`](contributing/standards/typescript/design-patterns.md) |
| Functions       | [`typescript/functions.md`](contributing/standards/typescript/functions.md)             |
| Naming          | [`typescript/naming.md`](contributing/standards/typescript/naming.md)                   |
| Types           | [`typescript/types.md`](contributing/standards/typescript/types.md)                     |
| State           | [`typescript/state.md`](contributing/standards/typescript/state.md)                     |
| Errors          | [`typescript/errors.md`](contributing/standards/typescript/errors.md)                   |
| Conditionals    | [`typescript/conditionals.md`](contributing/standards/typescript/conditionals.md)       |
| Testing         | [`typescript/testing.md`](contributing/standards/typescript/testing.md)                 |
| Utilities       | [`typescript/utilities.md`](contributing/standards/typescript/utilities.md)             |
| Git commits     | [`git-commits.md`](contributing/standards/git-commits.md)                               |
| Pull requests   | [`git-pulls.md`](contributing/standards/git-pulls.md)                                   |
| Documentation   | [`documentation/writing.md`](contributing/standards/documentation/writing.md)           |

## Verification

After making changes, run the following to validate your work:

```bash
pnpm check          # typecheck + lint + format (run this first)
pnpm test           # run all tests
```

Additional commands when needed:

```bash
pnpm typecheck      # type check only
pnpm lint           # lint only (oxlint)
pnpm lint:fix       # auto-fix lint issues
pnpm format         # format check only (oxfmt)
pnpm format:fix     # auto-fix formatting
pnpm test:watch     # run tests in watch mode
```

Per-package:

```bash
pnpm build          # build with tsdown (esm, dts)
pnpm typecheck      # tsc --noEmit
pnpm test           # run package tests
```

## Task Completion

Before marking a task as complete, verify the following:

1. **Standards reviewed** — relevant standards in `contributing/standards/` were read before implementation
2. **Code compiles** — `pnpm typecheck` passes with no errors
3. **Linting passes** — `pnpm lint` reports no violations
4. **Formatting passes** — `pnpm format` reports no issues
5. **Tests pass** — `pnpm test` passes, including any new or modified tests
6. **Tests added** — new functionality has colocated unit tests (`src/**/*.test.ts`)
7. **No boundary violations** — no `class`, `let`, `throw`, `any`, `switch`, loops, or mutation introduced

## Parallelization

Maximize throughput by spawning background agents and teams for independent work. Sequential execution is the last resort.

**Spawn background agents aggressively:**

- Use `run_in_background: true` for any task that does not block your next step
- If 2+ tasks are independent, spawn them all in a single message as parallel tool calls
- Prefer multiple focused agents over one agent doing everything sequentially

**When to parallelize:**

- Research + implementation + testing — 3 agents
- Changes across multiple packages — 1 agent per package
- Documentation + code changes — 2 agents
- Exploring multiple directories or files — multiple Explore agents
- Code review + linting + testing — all in parallel

**Agent types:**

- `Explore` — fast codebase exploration (3+ searches), cheap
- `general-purpose` — multi-step tasks requiring file edits
- `Plan` — design implementation plans before coding
- `Bash` — git operations, command execution

**Do not spawn an agent for:**

- Reading a single file (use Read directly)
- A single grep/glob search (use Grep/Glob directly)

## Tech Stack

| Tool                                                   | Purpose                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| [ts-pattern](https://github.com/gvergnaud/ts-pattern)  | Pattern matching (required for 2+ branch conditionals)     |
| [es-toolkit](https://es-toolkit.sh)                    | Functional utilities (check before writing custom helpers) |
| [Zod](https://zod.dev)                                 | Schema validation at boundaries                            |
| [yargs](https://yargs.js.org)                          | CLI argument parsing                                       |
| [@clack/prompts](https://www.clack.cc)                 | CLI prompts and terminal UI                                |
| [tsdown](https://tsdown.dev)                           | Bundler (ESM, dts)                                         |
| [oxlint](https://oxc.rs)                               | Linting                                                    |
| [Vitest](https://vitest.dev)                           | Testing                                                    |
| [Changesets](https://github.com/changesets/changesets) | Versioning and publishing                                  |

## Git

Conventional Commits: `type(scope): description`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `security`

Scopes: `packages/core`, `packages/cli`, `deps`, `ci`, `repo`

See [commit standards](contributing/standards/git-commits.md) and [PR standards](contributing/standards/git-pulls.md).
