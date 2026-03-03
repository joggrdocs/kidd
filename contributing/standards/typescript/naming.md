# Naming Conventions

## Overview

Conventions for naming files, variables, and object properties. Consistent naming makes the codebase scannable, searchable, and predictable. These rules apply to all TypeScript source files in the monorepo.

## Rules

### File Naming

Use **kebab-case** for all file names. Design file names with `ls` in mind — they should be scannable and sortable.

| Type      | Pattern         | Example                |
| --------- | --------------- | ---------------------- |
| Module    | `kebab-case.ts` | `user-service.ts`      |
| Types     | `types.ts`      | `types.ts`             |
| Constants | `constants.ts`  | `constants.ts`         |
| Schema    | `schema.ts`     | `schema.ts`            |
| Utilities | `utils.ts`      | `utils.ts`             |
| Config    | `config.ts`     | `config.ts`            |
| Tests     | `*.test.ts`     | `user-service.test.ts` |

#### Correct

```
auth-strategy.ts
auth-types.ts
user-service.ts
user-types.ts
```

#### Incorrect

```
AuthStrategy.ts
auth_types.ts
userService.ts
```

### Variable Naming

Use **camelCase** for variables and function names.

#### Correct

```ts
const userId = '123'
const isAuthenticated = true
function parseHeaders() {}
```

#### Incorrect

```ts
const user_id = '123'
const IsAuthenticated = true
function ParseHeaders() {}
```

### Constant Naming

Use **SCREAMING_SNAKE_CASE** for constants. Group related constants in objects with `as const`.

#### Correct

```ts
export const MAX_RETRIES = 3

export const SCRIPT_EVENTS = {
  START: 'start',
  COMPLETE: 'complete',
} as const
```

#### Incorrect

```ts
export const maxRetries = 3
export const scriptEvents = { start: 'start' }
```

### Object Property Naming

Prefer **nested objects** when properties form a logical group. Use flat naming when the property is standalone or the object is a simple DTO.

#### Correct

```ts
// Nested — grouped by relationship
interface Config {
  runner: {
    timeout: number
    parallel: boolean
  }
  output: {
    format: string
    verbose: boolean
  }
}

// Flat — simple DTO, destructuring is primary use
interface RunScriptParams {
  name: string
  workspace: string
  dryRun: boolean
}
```

#### Incorrect

```ts
// Concatenated names instead of nesting
interface Config {
  runnerTimeout: number
  runnerParallel: boolean
  outputFormat: string
  outputVerbose: boolean
}

// Unnecessary nesting for unrelated properties
interface RunScriptParams {
  data: {
    name: string
    workspace: string
  }
}
```

### Directory Structure

Prefer **flat** structure. Only nest when there are 5+ related files or clear sub-domain boundaries.

#### Correct

```
# Flat for simple modules
lib/
├── config.ts
├── resolver.ts
└── types.ts

# Nested for complex modules
handlers/
├── init/
│   ├── prompts.ts
│   ├── templates.ts
│   └── index.ts
└── run/
    ├── executor.ts
    └── index.ts
```

#### Incorrect

```
# Over-nested for no reason
lib/
└── config/
    └── loader/
        └── index.ts
```

### Module File Organization

Each module should have consistent file organization. Keep types in `types.ts`, export public API from `index.ts`, and keep internal types unexported.

#### Correct

```
feature/
├── index.ts      # Public exports
├── types.ts      # Type definitions
├── constants.ts  # Constants
├── schema.ts     # Zod schemas
└── utils.ts      # Helper functions
```

```ts
// types.ts
export interface PublicType {
  // ...
}

interface InternalType {
  // ...
}
```

#### Incorrect

```ts
// Scattering types across multiple files in the same module
// feature/handler-types.ts
export interface HandlerType {}

// feature/util-types.ts
export interface UtilType {}
```

## References

- [Functions](./functions.md) -- Parameter naming conventions
