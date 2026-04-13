# Conditionals and Branching

## Overview

Patterns for conditional logic in TypeScript. This standard covers early returns, `if`/`else` for simple conditions, and `ts-pattern` for multi-branch matching. Ternaries are banned by the linter. Choosing the right construct keeps logic flat, exhaustive, and easy to follow.

## Rules

All examples in this document use `match` and `P` from [ts-pattern](https://github.com/gvergnaud/ts-pattern):

```ts
import { match, P } from 'ts-pattern'
```

### Use ts-pattern for Multi-Branch Logic

Use `ts-pattern` for conditional logic with 2+ branches. It provides exhaustiveness checking and better readability than switch statements or nested ternaries.

| Scenario           | Use            | Why                    |
| ------------------ | -------------- | ---------------------- |
| Single boolean     | `if`/`else`    | Simpler for true/false |
| Early return/guard | `if` statement | Cleaner guard clauses  |
| 2+ conditions      | `ts-pattern`   | Exhaustive, readable   |
| Type narrowing     | `ts-pattern`   | Type-safe matching     |

#### Correct

```ts
import { match, P } from 'ts-pattern'

// Match on value
const message = match(status)
  .with('pending', () => 'Waiting...')
  .with('success', () => 'Done!')
  .with('error', () => 'Failed')
  .exhaustive()

// Match on object shape
const result = match(event)
  .with({ type: 'script', status: 'running' }, () => showProgress())
  .with({ type: 'script' }, () => showIdle())
  .with({ type: 'task' }, () => showTaskInfo())
  .exhaustive()

// Match with wildcards and predicates
const label = match(count)
  .with(0, () => 'None')
  .with(1, () => 'One')
  .with(P.number.gte(2), () => 'Many')
  .exhaustive()
```

#### Incorrect

```ts
// Nested ternaries are hard to read
const message =
  status === 'pending'
    ? 'Waiting'
    : status === 'success'
      ? 'Done'
      : status === 'error'
        ? 'Failed'
        : 'Unknown'

// Switch without exhaustiveness
switch (status) {
  case 'pending':
    return 'Waiting'
  case 'success':
    return 'Done'
  // Missing 'error' case - no compiler warning!
}
```

### Use Inferred Types from Callbacks

Always use the inferred type from the `ts-pattern` callback parameter. Never cast to explicit types inside a match arm.

#### Correct

```ts
match(event)
  .with({ config: P.nonNullable, action: P.string }, (e) => {
    // `e` is automatically narrowed - use it directly
    console.log(e.config.path, e.action)
  })
  .otherwise(() => {})
```

#### Incorrect

```ts
match(event)
  .with({ config: P.nonNullable, action: P.string }, () => {
    const configEvent = event as ConfigEvent // Don't cast
    console.log(configEvent.config.path)
  })
  .otherwise(() => {})
```

### Match on Shape, Not Categories

Use `ts-pattern` directly to match on object shape rather than creating intermediate categorization functions.

#### Correct

```ts
match(event)
  .with({ scripts: P.nonNullable, workspace: P.string }, (e) => handleScripts(e))
  .with({ config: P.nonNullable }, (e) => handleConfig(e))
  .otherwise(() => handleUnknown())
```

#### Incorrect

```ts
const category = categorizeEvent(event) // Don't pre-categorize
match(category)
  .with('scripts', () => handleScripts(event as ScriptsEvent))
  .with('config', () => handleConfig(event as ConfigEvent))
  .otherwise(() => {})
```

### Always Use .exhaustive()

Use `.exhaustive()` to ensure all cases are handled at compile time. Reserve `.otherwise()` for genuinely open-ended matches.

#### Correct

```ts
type Status = 'pending' | 'success' | 'error'

// Compiler error if a case is missing
match(status)
  .with('pending', () => 'Waiting')
  .with('success', () => 'Done')
  .with('error', () => 'Failed')
  .exhaustive()
```

#### Incorrect

```ts
match(status)
  .with('pending', () => 'Waiting')
  .otherwise(() => 'Unknown') // Hides missing cases
```

### Use if/else for Simple Conditions

Use `if`/`else` for simple boolean conditions. Ternaries are not permitted by the linter. Extract the logic into a function to keep bindings `const`.

#### Correct

```ts
function getLabel(isActive: boolean): string {
  if (isActive) {
    return 'Active'
  }
  return 'Inactive'
}

const label = getLabel(isActive)
```

#### Incorrect

```ts
// Ternaries are banned by oxlint
const label = isActive ? 'Active' : 'Inactive'
```

### Use Early Returns for Guards

Use `if` statements with early returns for guard clauses that reject invalid state before the main logic.

#### Correct

```ts
function processScript(script: Script | null) {
  if (!script) return null
  if (!script.enabled) return null

  // Main logic here
  return execute(script)
}
```

#### Incorrect

```ts
function processScript(script: Script | null) {
  if (script) {
    if (script.enabled) {
      return execute(script)
    }
  }
  return null
}
```

## Resources

- [ts-pattern Documentation](https://github.com/gvergnaud/ts-pattern)

## References

- [Types](./types.md) -- Discriminated unions for type-safe matching
