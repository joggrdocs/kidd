# Implementation Plan: Middleware Refactor + Render Support

## Context for Agents

Before implementing, read `CLAUDE.md` for all coding standards (strict FP, no class/let/throw/loops, ts-pattern, es-toolkit, Zod, Result tuples, JSDoc on all functions, readonly properties).

**Key patterns to follow** (read these files as reference):

- `packages/core/src/middleware/icons/icons.ts` — middleware factory pattern (options -> middleware -> decorateContext -> next)
- `packages/core/src/middleware/http/http.ts` — simpler middleware factory example
- `packages/core/src/context/decorate.ts` — how to add typed properties to context
- `packages/core/src/middleware.ts` — the `middleware()` wrapper
- `packages/core/src/context/prompts.ts` — cancel signal unwrapping (absorb into logger middleware)
- `packages/core/src/lib/logger.ts` — current logger (being replaced, use as reference for clack delegation)

**Files that reference old API** (need updating in Wave 3-4):

- `ctx.logger`: `middleware/icons/icons.ts`, `middleware/icons/install.ts`, `cli.ts`, all test files
- `ctx.spinner`: `middleware/icons/install.ts`, test files
- `ctx.prompts`: `middleware/auth/auth.ts`, `middleware/icons/install.ts`, test files
- `CliLogger`: `context/types.ts`, `context/create-context.ts`, `test/context.ts`, `test/types.ts`, `cli.ts`, `middleware/icons/context.ts`
- `formatTally/TallyInput`: `lib/logger.ts`, `lib/format/index.ts`, `lib/format/tally.ts`, `lib/format/tally.test.ts`, `lib/format/types.ts`

**Export paths** (in `package.json` `exports` field):

- `@kidd-cli/core/logger` — currently points to `lib/logger.ts`, will point to `middleware/logger/index.ts`
- `@kidd-cli/core/report` — new, points to `middleware/report/index.ts`
- `@kidd-cli/core/ui` — new, points to `ui/index.ts` (Phase 3)

**Verification**: Run `pnpm check && pnpm test` from repo root after each wave.

---

## Progress Tracker

The main agent updates this section as work progresses. Each task has a status and the agent assigned to it.

**Statuses**: `pending` | `in-progress (agent-name)` | `done` | `blocked (reason)`

### Wave 1 — Foundation

| ID  | Task                                          | Status | Agent  |
| --- | --------------------------------------------- | ------ | ------ |
| A   | Rename Tally -> Summary in format lib         | `done` | wave1a |
| B   | Create logger middleware (new files)          | `done` | wave1b |
| C   | Add render types + autoloader .tsx support    | `done` | wave1c |
| D   | Build config (tsdown, package.json, tsconfig) | `done` | wave1d |

### Wave 2 — Integration

| ID  | Task                                    | Status | Depends On | Agent  |
| --- | --------------------------------------- | ------ | ---------- | ------ |
| E   | Create report middleware (new files)    | `done` | A          | wave2e |
| F   | Slim Context + update create-context    | `done` | B          | wave2f |
| G   | Update cli.ts (remove old logger usage) | `done` | B          | wave2g |

### Wave 3 — Rewire Consumers

| ID  | Task                                     | Status | Depends On | Agent  |
| --- | ---------------------------------------- | ------ | ---------- | ------ |
| H   | Update icons middleware                  | `done` | F          | wave3h |
| I   | Update auth middleware                   | `done` | F          | wave3i |
| J   | Update public exports + delete old files | `done` | E, F, G    | wave3j |
| K   | Wire render path in runtime              | `done` | C, F       | wave3k |
| L   | Update README docs in middleware         | `done` | H, I       | main   |

### Wave 4 — Tests

| ID  | Task                                   | Status | Depends On | Agent   |
| --- | -------------------------------------- | ------ | ---------- | ------- |
| M   | Update test utilities (mocks, helpers) | `done` | Wave 3     | wave4mn |
| N   | Update all test files                  | `done` | M          | wave4mn |

### Wave 5 — UI + Docs

| ID  | Task                                 | Status | Depends On | Agent |
| --- | ------------------------------------ | ------ | ---------- | ----- |
| O   | UI components (`@kidd-cli/core/ui`)  | `done` | Wave 4     | main  |
| P   | Standards doc + existing doc updates | `done` | Wave 4     | main  |

### Wave 6 — Ship

| ID  | Task                                | Status    | Agent |
| --- | ----------------------------------- | --------- | ----- |
| Q   | Commit + push + open PR             | `pending` | —     |
| R   | CI/CodeRabbit loop (3 min interval) | `pending` | —     |

### Gate Checks

| Gate                                              | Status    |
| ------------------------------------------------- | --------- |
| Wave 1 complete                                   | `done`    |
| Wave 2 complete                                   | `done`    |
| Wave 3 complete                                   | `done`    |
| Wave 4 complete (`pnpm check && pnpm test` green) | `done`    |
| Wave 5 complete                                   | `done`    |
| PR opened                                         | `pending` |
| CI green                                          | `pending` |
| CodeRabbit approved                               | `pending` |

---

## Overview

Three major changes to `@kidd-cli/core`:

1. **Middleware refactor** — Move `logger`, `spinner`, `prompts` off the base `Context` into a `logger()` middleware that provides `ctx.log`. Extract diagnostics into a `report()` middleware.
2. **Command render support** — Add `render` as an alternative to `handler` on commands, enabling React/Ink-based TUI commands.
3. **UI components** — Export Ink-based React components from `@kidd-cli/core/ui` that mirror the imperative API.

## API

### `ctx.log` (provided by `logger()` middleware)

```ts
// --- Print (fire-and-forget messages) ---
ctx.log.info('message')
ctx.log.success('message')
ctx.log.error('message')
ctx.log.warn('message')
ctx.log.step('message')
ctx.log.message('message', { symbol: '~' })
ctx.log.intro('My CLI v1.0')
ctx.log.outro('Done!')
ctx.log.note('body', 'title')
ctx.log.newline()
ctx.log.raw('plain text')

// --- Spinner (factory — creates and starts) ---
const s = ctx.log.spinner('Building...')
s.message('Still building...')
s.stop('Built!')

// --- Prompts (async, interactive input) ---
const answer = await ctx.log.confirm({ message: 'Continue?' })
const name = await ctx.log.text({ message: 'Name?', placeholder: 'John' })
const pass = await ctx.log.password({ message: 'Token?' })
const env = await ctx.log.select({ message: 'Env?', options: [...] })
const tools = await ctx.log.multiselect({ message: 'Tools?', options: [...] })
```

### `ctx.report` (provided by `report()` middleware)

```ts
ctx.report.check({ status: 'pass', name: 'src/index.ts', duration: 125 })
ctx.report.finding({ severity: 'error', rule: 'no-unused-vars', message: '...' })
ctx.report.summary({ style: 'tally', stats: [...] })
```

### Middleware usage

```ts
import { cli } from '@kidd-cli/core'
import { logger } from '@kidd-cli/core/logger'
import { report } from '@kidd-cli/core/report'

cli({
  name: 'my-cli',
  middleware: [
    logger({ withGuide: false }), // ctx.log
    report(), // ctx.report
  ],
})
```

### Command modes

```ts
// Imperative (handler) — uses ctx.log
command({
  name: 'deploy',
  handler(ctx) {
    ctx.log.info('Deploying...')
    const s = ctx.log.spinner('Building...')
    s.stop('Built!')
  },
})

// Declarative (render) — React/Ink, .tsx file
command({
  name: 'dashboard',
  render: DashboardApp,
})
```

## Naming Conventions

| Old                         | New                      | Location                                     |
| --------------------------- | ------------------------ | -------------------------------------------- |
| `ctx.logger.info()`         | `ctx.log.info()`         | Via `logger()` middleware                    |
| `ctx.logger.success()`      | `ctx.log.success()`      | Via `logger()` middleware                    |
| `ctx.logger.error()`        | `ctx.log.error()`        | Via `logger()` middleware                    |
| `ctx.logger.warn()`         | `ctx.log.warn()`         | Via `logger()` middleware                    |
| `ctx.logger.step()`         | `ctx.log.step()`         | Via `logger()` middleware                    |
| `ctx.logger.message()`      | `ctx.log.message()`      | Via `logger()` middleware                    |
| `ctx.logger.intro()`        | `ctx.log.intro()`        | Via `logger()` middleware                    |
| `ctx.logger.outro()`        | `ctx.log.outro()`        | Via `logger()` middleware                    |
| `ctx.logger.note()`         | `ctx.log.note()`         | Via `logger()` middleware                    |
| `ctx.logger.newline()`      | `ctx.log.newline()`      | Via `logger()` middleware                    |
| `ctx.logger.print()`        | `ctx.log.raw()`          | Via `logger()` middleware                    |
| `ctx.spinner.start()`       | `ctx.log.spinner('msg')` | Via `logger()` middleware (creates + starts) |
| `ctx.prompts.confirm()`     | `ctx.log.confirm()`      | Via `logger()` middleware                    |
| `ctx.prompts.text()`        | `ctx.log.text()`         | Via `logger()` middleware                    |
| `ctx.prompts.password()`    | `ctx.log.password()`     | Via `logger()` middleware                    |
| `ctx.prompts.select()`      | `ctx.log.select()`       | Via `logger()` middleware                    |
| `ctx.prompts.multiselect()` | `ctx.log.multiselect()`  | Via `logger()` middleware                    |
| `ctx.logger.check()`        | `ctx.report.check()`     | Via `report()` middleware                    |
| `ctx.logger.finding()`      | `ctx.report.finding()`   | Via `report()` middleware                    |
| `ctx.logger.tally()`        | `ctx.report.summary()`   | Via `report()` middleware                    |

---

## Interfaces

### Log

```ts
interface Log {
  // Print
  info(message: string): void
  success(message: string): void
  error(message: string): void
  warn(message: string): void
  step(message: string): void
  message(message: string, opts?: { symbol?: string }): void
  intro(title?: string): void
  outro(message?: string): void
  note(message?: string, title?: string): void
  newline(): void
  raw(text: string): void

  // Spinner (creates and starts)
  spinner(message?: string): Spinner

  // Prompts
  confirm(opts: ConfirmOptions): Promise<boolean>
  text(opts: TextOptions): Promise<string>
  password(opts: TextOptions): Promise<string>
  select<T>(opts: SelectOptions<T>): Promise<T>
  multiselect<T>(opts: MultiSelectOptions<T>): Promise<T[]>
}
```

### Spinner

```ts
interface Spinner {
  stop(message?: string): void
  message(message: string): void
}
```

### Report

```ts
interface Report {
  check(input: CheckInput): void
  finding(input: FindingInput): void
  summary(input: SummaryInput): void
}
```

### LoggerOptions

```ts
interface LoggerOptions {
  readonly withGuide?: boolean
  readonly output?: NodeJS.WritableStream
  readonly log?: Log // override with custom implementation
}
```

### ReportOptions

```ts
interface ReportOptions {
  readonly output?: NodeJS.WritableStream
  readonly report?: Report // override with custom implementation
}
```

---

## Phase 1: Middleware Refactor

### 1.1 — Create `Log` interface and `createLog` factory

**New file**: `src/middleware/logger/log.ts`

- `Log` interface (see above)
- `createLog(options: { output?: NodeJS.WritableStream, withGuide?: boolean }): Log`
- Print methods delegate to `clack.log.*`, forwarding `withGuide` per-call where supported
- `raw()` and `newline()` write directly to the output stream
- `spinner(message?)` creates a `clack.spinner()`, calls `start(message)`, returns `{ stop, message }`
- Prompt methods delegate to `clack.*` with cancel signal unwrapping

### 1.2 — Create `logger()` middleware

**New files**:

- `src/middleware/logger/logger.ts` — middleware factory
- `src/middleware/logger/log.ts` — Log interface + createLog factory
- `src/middleware/logger/types.ts` — options, env types
- `src/middleware/logger/index.ts` — barrel export

**Middleware behavior**:

1. Call `clack.updateSettings({ withGuide })` if `withGuide` is provided
2. Create `Log` instance (or use override from options)
3. Decorate context: `ctx.log`
4. Call `next()`

**Env type**:

```ts
interface LoggerEnv {
  readonly Variables: {
    readonly log: Log
  }
}
```

**Export path**: `@kidd-cli/core/logger`

### 1.3 — Create `report()` middleware

**New files**:

- `src/middleware/report/report.ts` — middleware factory
- `src/middleware/report/types.ts` — Report interface, options
- `src/middleware/report/index.ts` — barrel export

**Middleware behavior**:

1. Create Report backed by format functions + `output.write()` (or use override)
2. Decorate context: `ctx.report`
3. Call `next()`

**Env type**:

```ts
interface ReportEnv {
  readonly Variables: {
    readonly report: Report
  }
}
```

**Export path**: `@kidd-cli/core/report`

### 1.4 — Slim down base Context

**Modify**: `src/context/types.ts`

Remove from `Context` interface:

- `logger: CliLogger`
- `spinner: Spinner`
- `prompts: Prompts`

Keep on `Context`:

- `args`, `config`, `meta`, `store`, `format`, `colors`, `fail`

**Modify**: `src/context/create-context.ts`

- Remove logger, spinner, prompts creation
- Remove `CliLogger`, `Spinner`, `Prompts` imports
- Remove `@clack/prompts` import
- Remove optional logger/spinner/prompts from `CreateContextOptions`

### 1.5 — Rename Tally -> Summary

**Modify**: `src/lib/format/types.ts`

- `TallyInput` -> `SummaryInput`
- `TallyBlockInput` -> `SummaryBlockInput`
- `TallyInlineInput` -> `SummaryInlineInput`
- `TallyStat` -> `SummaryStat`

**Modify**: `src/lib/format/tally.ts`

- `formatTally` -> `formatSummary`
- Update all type references

**Modify**: `src/lib/format/index.ts` — update exports

### 1.6 — Remove old logger, update build

**Delete**: `src/lib/logger.ts` — replaced by `src/middleware/logger/log.ts`

**Modify**: `tsdown.config.ts`

- Remove `'lib/logger'` entry
- Add `'middleware/logger'` and `'middleware/report'` entries

**Modify**: `package.json` exports

- Remove `./logger` export path
- Add `./logger` pointing to new middleware
- Add `./report` export path

### 1.7 — Update internal consumers

**Modify**: `src/cli.ts`

- `exitOnError` currently uses `createCliLogger` for boot errors (before middleware)
- Replace with direct `clack.log.error()` call
- Remove `createCliLogger` import

**Modify**: `src/test/context.ts`

- Update `createTestContext` — remove logger/spinner/prompts from base context
- Add `createTestLog()` helper that returns a mocked `Log` instance
- Update existing test utilities

**Move**: `src/context/prompts.ts` -> absorbed into `src/middleware/logger/log.ts`

- Cancel signal unwrapping logic moves into the `createLog` factory

### 1.8 — Update public exports

**Modify**: `src/index.ts`

- Remove `CliLogger` type export
- Export new types: `Log`, `Spinner`, `Report`
- Consider re-exporting `logger` and `report` from main entry

### 1.9 — Update existing middleware that uses logger

Search for any middleware accessing `ctx.logger` and update to `ctx.log`.

### 1.10 — Update all tests

- `ctx.logger.*` -> `ctx.log.*`
- `ctx.logger.check/finding/tally` -> `ctx.report.*`
- `ctx.spinner.*` -> `ctx.log.spinner()`
- `ctx.prompts.*` -> `ctx.log.*`
- Test utilities updated with new mock shapes

---

## Phase 2: Command Render Support

### 2.1 — Add `render` to command types

**Modify**: `src/types/command.ts`

Add `RenderFn` type:

```ts
type RenderFn<TArgs extends AnyRecord = AnyRecord, TConfig extends AnyRecord = AnyRecord> = (
  props: RenderProps<TArgs, TConfig>
) => React.ReactElement

interface RenderProps<TArgs, TConfig> {
  readonly args: DeepReadonly<TArgs>
  readonly config: DeepReadonly<TConfig>
  readonly meta: DeepReadonly<Meta>
  readonly store: Store
  readonly colors: Colors
}
```

Add `render` to `CommandDef` (mutually exclusive with `handler`):

```ts
readonly render?: RenderFn<...>
```

Add `render` to `Command` type.

### 2.2 — Add `.tsx` / `.jsx` to autoloader

**Modify**: `src/autoload.ts`

```ts
const VALID_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.tsx', '.jsx'])
```

Autoloader already ignores `_` prefixed files and dirs — no other changes needed.

### 2.3 — Wire render path in runtime

**Modify**: `src/runtime/runtime.ts`

In `execute()`, after context creation, detect `render` vs `handler`:

- If `handler` — run middleware chain as today
- If `render` — dynamic `import('ink')`, call `render()` with the React component, pass props from context, await `waitUntilExit()`

**Modify**: `src/runtime/types.ts`

Add `render` to `ResolvedExecution` and `ResolvedCommand`.

### 2.4 — Add JSX config

**Modify**: `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

**Modify**: `packages/core/tsconfig.json`

- Update exclude: `["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]`

---

## Phase 3: UI Components (`@kidd-cli/core/ui`)

### 3.1 — Create component directory

**New files**:

- `src/ui/index.ts` — barrel export

Components (re-export from `@inkjs/ui` where possible, wrap for theming):

- `src/ui/spinner.tsx`
- `src/ui/select.tsx`
- `src/ui/confirm.tsx`
- `src/ui/text-input.tsx`
- `src/ui/multi-select.tsx`
- `src/ui/password-input.tsx`

### 3.2 — Add Ink dependencies

**Modify**: `packages/core/package.json`

Add as optional peer dependencies:

```json
{
  "peerDependencies": {
    "ink": ">=5.0.0",
    "react": ">=18.0.0",
    "@inkjs/ui": ">=2.0.0"
  },
  "peerDependenciesMeta": {
    "ink": { "optional": true },
    "react": { "optional": true },
    "@inkjs/ui": { "optional": true }
  }
}
```

### 3.3 — Add build entries

**Modify**: `tsdown.config.ts`

```ts
entry: {
  // ...existing
  'middleware/logger': 'src/middleware/logger/index.ts',
  'middleware/report': 'src/middleware/report/index.ts',
  'ui/index': 'src/ui/index.ts',
}
```

**Modify**: `package.json` exports

```json
{
  "./ui": {
    "types": "./dist/ui/index.d.ts",
    "default": "./dist/ui/index.js"
  }
}
```

---

## Phase 4: Standards & Documentation

### 4.1 — New components standard

**New file**: `contributing/standards/typescript/components.md`

Covers:

- `.tsx` file convention (command files can be `.ts` or `.tsx`)
- Component naming (PascalCase function components)
- Props interfaces (readonly, colocated)
- Colocation rules (`_components/` for command-private, top-level for shared)
- When to use `render` vs `handler`
- React/Ink patterns (Box, Text, hooks, layout)
- State management (React rules apply inside `.tsx`)

### 4.2 — Update existing docs

- Architecture docs for new middleware structure
- "Adding a CLI command" guide for render mode
- API reference for new exports

---

## File Change Summary

### New Files

```
src/middleware/logger/
  index.ts          — barrel export
  logger.ts         — logger() middleware factory
  log.ts            — Log interface + createLog factory
  types.ts          — LoggerOptions, LoggerEnv, Log, Spinner

src/middleware/report/
  index.ts          — barrel export
  report.ts         — report() middleware factory
  types.ts          — ReportOptions, ReportEnv, Report, SummaryInput

src/ui/                        (Phase 3)
  index.ts          — barrel export
  spinner.tsx
  select.tsx
  confirm.tsx
  text-input.tsx
  multi-select.tsx
  password-input.tsx

contributing/standards/typescript/components.md  (Phase 4)
```

### Modified Files

```
src/context/types.ts          — remove logger, spinner, prompts from Context
src/context/create-context.ts — remove logger, spinner, prompts creation
src/context/index.ts          — remove prompts export
src/lib/format/types.ts       — rename Tally* -> Summary*
src/lib/format/tally.ts       — rename formatTally -> formatSummary
src/lib/format/index.ts       — update exports
src/cli.ts                    — replace createCliLogger with direct clack call
src/autoload.ts               — add .tsx/.jsx to VALID_EXTENSIONS
src/types/command.ts          — add render, RenderFn, RenderProps
src/command.ts                — handle render in command() factory
src/runtime/runtime.ts        — detect render vs handler, wire Ink
src/runtime/types.ts          — add render to ResolvedExecution
src/test/context.ts           — update mocks for new context shape
src/index.ts                  — update exports
tsdown.config.ts              — add new entries, remove old
package.json                  — update exports, add peer deps
tsconfig.base.json            — add jsx: react-jsx
packages/core/tsconfig.json   — update exclude for .test.tsx
```

### Deleted Files

```
src/lib/logger.ts             — replaced by logger middleware
src/lib/logger.test.ts        — replaced by logger middleware tests
src/context/prompts.ts        — absorbed into logger middleware
```

---

## Breaking Changes

1. `ctx.logger` removed — use `logger()` middleware, access via `ctx.log`
2. `ctx.spinner` removed — use `ctx.log.spinner('msg')` (creates + starts)
3. `ctx.prompts` removed — prompts are flat on `ctx.log` (e.g. `ctx.log.confirm()`)
4. `CliLogger` type removed — replaced by `Log` interface
5. `@kidd-cli/core/logger` export now points to middleware (was standalone logger)
6. `TallyInput` renamed to `SummaryInput`
7. `formatTally` renamed to `formatSummary`
8. `logger.tally()` -> `ctx.report.summary()`
9. `logger.print()` -> `ctx.log.raw()`
10. `Spinner` interface simplified — no `start()`, spinner starts on creation

---

## Parallel Execution Plan

### Wave 1 — Foundation (4 agents, fully parallel, no file conflicts)

All agents create new files or touch isolated files with zero overlap.

| Agent | Task                                          | Files Touched                                                                                    |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **A** | Rename Tally -> Summary in format lib         | `format/types.ts`, `format/tally.ts` (rename content), `format/index.ts`, `format/tally.test.ts` |
| **B** | Create logger middleware (all new files)      | NEW: `middleware/logger/log.ts`, `logger.ts`, `types.ts`, `index.ts`                             |
| **C** | Add render types + autoloader .tsx support    | `types/command.ts`, `command.ts`, `autoload.ts`                                                  |
| **D** | Build config (tsdown, package.json, tsconfig) | `tsdown.config.ts`, `package.json`, `tsconfig.base.json`, `core/tsconfig.json`                   |

**Gate**: All 4 agents complete before Wave 2.

---

### Wave 2 — Integration (3 agents, parallel, no file conflicts)

Agents modify different files. Depend on Wave 1 artifacts.

| Agent | Task                                     | Depends On                   | Files Touched                                                       |
| ----- | ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| **E** | Create report middleware (all new files) | A (Summary types)            | NEW: `middleware/report/report.ts`, `types.ts`, `index.ts`          |
| **F** | Slim Context + update create-context     | B (logger middleware exists) | `context/types.ts`, `context/create-context.ts`, `context/index.ts` |
| **G** | Update cli.ts (remove old logger usage)  | B (logger middleware exists) | `cli.ts`                                                            |

**Gate**: All 3 agents complete before Wave 3.

---

### Wave 3 — Rewire Consumers (5 agents, parallel, no file conflicts)

Each agent touches different files. All old references updated.

| Agent | Task                                                                | Depends On                                  | Files Touched                                                   |
| ----- | ------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| **H** | Update icons middleware (`ctx.logger/spinner/prompts` -> `ctx.log`) | F (new Context)                             | `middleware/icons/icons.ts`, `middleware/icons/install.ts`      |
| **I** | Update auth middleware (`ctx.prompts` -> `ctx.log`)                 | F (new Context)                             | `middleware/auth/auth.ts`                                       |
| **J** | Update public exports + delete old files                            | E, F, G (all new middleware + context done) | `index.ts`, DELETE `lib/logger.ts`, DELETE `context/prompts.ts` |
| **K** | Wire render path in runtime                                         | C (render types), F (context)               | `runtime/runtime.ts`, `runtime/types.ts`                        |
| **L** | Update README docs in middleware                                    | H, I (middleware updated)                   | `middleware/auth/README.md`, `middleware/http/README.md`        |

**Gate**: All 5 agents complete before Wave 4.

---

### Wave 4 — Tests (2 agents, parallel)

All source changes are stable. Tests can be updated safely.

| Agent | Task                                   | Depends On           | Files Touched                                                                                                                                                                                                                        |
| ----- | -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M** | Update test utilities (mocks, helpers) | Wave 3 complete      | `test/context.ts`, `test/types.ts`                                                                                                                                                                                                   |
| **N** | Update all test files                  | M (test utils ready) | `test/context.test.ts`, `test/handler.test.ts`, `test/middleware.test.ts`, `context/create-context.test.ts`, `lib/format/tally.test.ts` (renamed refs), `middleware/icons/install.test.ts`, `lib/logger.test.ts` (delete or rewrite) |

**Note**: M must finish before N starts (N depends on updated test utils). Run M first, then N.

**Gate**: `pnpm check && pnpm test` passes.

---

### Wave 5 — UI + Docs (2 agents, parallel)

Everything is stable and tested. These are additive.

| Agent | Task                                 | Depends On   | Files Touched                                                                                                                                |
| ----- | ------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **O** | UI components (`@kidd-cli/core/ui`)  | Wave 4 green | NEW: `ui/index.ts`, `ui/spinner.tsx`, `ui/select.tsx`, `ui/confirm.tsx`, `ui/text-input.tsx`, `ui/multi-select.tsx`, `ui/password-input.tsx` |
| **P** | Standards doc + existing doc updates | Wave 4 green | NEW: `contributing/standards/typescript/components.md`, update architecture/guide docs                                                       |

**Gate**: Final `pnpm check && pnpm test`.

---

### Summary

```
Wave 1:  A ─┐   B ─┐   C ───┐   D ───┐
             │      │        │        │
Wave 2:  E ←─┘  F ←─┘   G ←──┘       │
             │      │     │           │
Wave 3:  H ←─┤  I ←─┤  J ←┤  K ←──┤  L
             │      │     │     │     │
Wave 4:  M ←─┴──────┴─────┘     │     │
         N ← M                   │     │
             │                   │     │
Wave 5:  O ←─┴───────────────────┘  P ←┘
```

**Total agents**: 16 across 5 waves + post-merge workflow
**Critical path**: B -> F -> J -> M -> N (logger middleware -> context -> exports -> test utils -> tests)
**Max parallelism**: 5 agents (Wave 3)

---

### Wave 6 — Ship It

After Wave 5 completes and `pnpm check && pnpm test` passes locally:

1. **Commit** all changes with conventional commit message
2. **Push** branch to GitHub
3. **Open PR** via `gh pr create` with summary of all changes
4. **Loop**: sleep 3 minutes, then check:
   - `gh pr checks` — are CI checks passing?
   - `gh pr view --json reviews` — did CodeRabbit leave a review?
   - If CodeRabbit left review comments, read them, address the issues, commit + push
   - If CI is failing, read the logs, fix the issue, commit + push
   - If both CI green and no unresolved CodeRabbit comments, done
   - Repeat loop until clean
