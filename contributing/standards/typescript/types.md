# Type Patterns

## Overview

Patterns for defining and using TypeScript types effectively. Prefer discriminated unions for variant modeling, branded types for domain safety, and utility types to avoid repetition. These rules apply to all type definitions in the monorepo.

## Rules

### Use Discriminated Unions for Variants

Define a common discriminator field (usually `type`, `kind`, or `strategy`) that TypeScript uses to narrow the type. Combine with `ts-pattern` for exhaustive matching.

#### Correct

```ts
type RunResult =
  | { type: 'success'; output: string }
  | { type: 'failure'; error: string; exitCode: number }
  | { type: 'skipped'; reason: string }

// Narrowing with if-checks
function summarize(result: RunResult): string {
  if (result.type === 'success') {
    return result.output
  }
  if (result.type === 'failure') {
    return `Exit ${result.exitCode}: ${result.error}`
  }
  return `Skipped: ${result.reason}`
}

// Exhaustive matching with ts-pattern
import { match } from 'ts-pattern'

const summary = match(result)
  .with({ type: 'success' }, (r) => r.output)
  .with({ type: 'failure' }, (r) => `Exit ${r.exitCode}: ${r.error}`)
  .with({ type: 'skipped' }, (r) => `Skipped: ${r.reason}`)
  .exhaustive()
```

### Use type-fest for Common Utilities

Use [type-fest](https://github.com/sindresorhus/type-fest) for type utilities not included in TypeScript's standard library.

| Utility             | Description                    | Example                       |
| ------------------- | ------------------------------ | ----------------------------- |
| `SetRequired<T, K>` | Make specific keys required    | `SetRequired<User, 'email'>`  |
| `SetOptional<T, K>` | Make specific keys optional    | `SetOptional<User, 'avatar'>` |
| `PartialDeep<T>`    | Deep partial (nested optional) | `PartialDeep<Config>`         |
| `ReadonlyDeep<T>`   | Deep readonly                  | `ReadonlyDeep<State>`         |
| `Except<T, K>`      | Omit with better inference     | `Except<User, 'password'>`    |
| `Simplify<T>`       | Flatten intersection types     | `Simplify<A & B>`             |

#### Correct

```ts
import type { SetRequired, PartialDeep } from 'type-fest'

interface Config {
  name: string
  root?: string
  scripts?: Record<string, string>
}

// Make root required after resolution
type ResolvedConfig = SetRequired<Config, 'root'>

// Deep partial for patch operations
type ConfigPatch = PartialDeep<Config>
```

### Write Type Guards for Runtime Checks

Create custom type guard functions that return `value is T` for runtime type narrowing.

#### Correct

```ts
function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value != null
}

function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true
}

// Usage
const result = loadConfig()
if (isOk(result)) {
  console.log(result.value)
}
```

#### Incorrect

```ts
// Using `as` assertion instead of a guard
function getConfig(data: unknown) {
  const config = data as Config // Unsafe - no runtime check
  return config
}
```

### Use Built-in Utility Types

TypeScript ships utility types for common transformations. Use them instead of hand-rolling equivalents.

| Utility         | Use Case                          | Example                |
| --------------- | --------------------------------- | ---------------------- |
| `Partial<T>`    | All properties optional           | Update payloads        |
| `Required<T>`   | All properties required           | Validated configs      |
| `Pick<T, K>`    | Select specific properties        | API response subsets   |
| `Omit<T, K>`    | Exclude specific properties       | Remove internal fields |
| `Record<K, V>`  | Object with typed keys            | Lookup tables          |
| `Extract<T, U>` | Extract matching types from union | Filter union variants  |
| `Exclude<T, U>` | Remove matching types from union  | Remove union variants  |

#### Correct

```ts
interface Script {
  name: string
  command: string
  workspace: string
  description: string
}

// For update operations - all fields optional
type ScriptUpdate = Partial<Script>

// For display - only relevant fields
type ScriptSummary = Pick<Script, 'name' | 'workspace'>

// Lookup table
type ScriptMap = Record<string, Script>
```

### Use Branded Types for Domain Safety

Use branded types to prevent mixing up structurally identical primitives.

#### Correct

```ts
type Brand<T, B> = T & { __brand: B }

type WorkspaceId = Brand<string, 'WorkspaceId'>
type ScriptName = Brand<string, 'ScriptName'>

function workspaceId(id: string): WorkspaceId {
  return id as WorkspaceId
}

function scriptName(name: string): ScriptName {
  return name as ScriptName
}

// Type error - cannot mix them up
function runScript(workspace: WorkspaceId, script: ScriptName) {}
runScript(scriptName('build'), workspaceId('root')) // Type error!
```

#### Incorrect

```ts
// Easy to mix up positional strings
function runScript(workspace: string, script: string) {}
runScript('build', 'root') // Compiles but wrong order!
```

### Use Const Assertions for Literal Types

Use `as const` for literal types, readonly arrays, and deriving union types from values.

#### Correct

```ts
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
type LogLevel = (typeof LOG_LEVELS)[number]
// Type: "debug" | "info" | "warn" | "error"

const DEFAULTS = {
  timeout: 5000,
  parallel: false,
} as const
// Type: { readonly timeout: 5000; readonly parallel: false }
```

#### Incorrect

```ts
// Without as const, you get wide types
const LOG_LEVELS = ['debug', 'info', 'warn', 'error']
// Type: string[] — no literal union possible

const DEFAULTS = {
  timeout: 5000,
  parallel: false,
}
// Type: { timeout: number; parallel: boolean } — literals lost
```

## Resources

- [type-fest Documentation](https://github.com/sindresorhus/type-fest)
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

## References

- [Conditionals](./conditionals.md) -- Using discriminated unions with ts-pattern
