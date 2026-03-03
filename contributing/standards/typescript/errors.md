# Error Handling

## Overview

All operations that can fail in expected ways use the `Result<T, E>` type instead of throwing exceptions. This makes error handling explicit, type-safe, and composable. The pattern is inspired by Rust's Result type and pairs naturally with `ts-pattern` for exhaustive error matching.

## Rules

### Use the Result Type

Define success and failure as a tuple where the first element is the error (or `null`) and the second is the value (or `null`). Destructure the tuple to check which case occurred.

```ts
type Result<T, E = Error> = readonly [E, null] | readonly [null, T]
```

Construct success and failure tuples directly:

```ts
// Success
const success: Result<Config, ParseError> = [null, config]

// Failure
const failure: Result<Config, ParseError> = [{ type: 'parse_error', message: 'Invalid JSON' }, null]
```

For CLI handlers, use the `HandlerResult` specialization with `ok()` and `fail()` constructors from `src/lib/result.ts`:

```ts
type HandlerResult<T = void> = Result<T, HandlerError>

interface HandlerError {
  readonly message: string
  readonly hint?: string
  readonly exitCode?: number
}

function ok(): HandlerResult<void>
function ok<T>(value: T): HandlerResult<T>

function fail(error: HandlerError): HandlerResult<never>
```

### Return Results for Expected Failures

Use `Result<T, E>` for operations that can fail in expected ways such as parsing, validation, file I/O, and external calls. Define a specific error interface for each domain.

#### Correct

```ts
import type { Result } from '../lib/result.ts'

interface ParseError {
  type: 'parse_error' | 'validation_error'
  message: string
}

function parseConfig(json: string): Result<Config, ParseError> {
  try {
    const data = JSON.parse(json)
    return [null, data]
  } catch {
    return [{ type: 'parse_error', message: 'Invalid JSON' }, null]
  }
}

// Usage — destructure the tuple
const [parseError, config] = parseConfig(input)

if (parseError) {
  logger.error({ error: parseError }, 'Failed to parse config')
  return
}

// config is typed as Config
processConfig(config)
```

#### Incorrect

```ts
// Throwing instead of returning a Result
function parseConfig(json: string): Config {
  if (!json) {
    throw new Error('Empty input') // Don't throw
  }
  return JSON.parse(json)
}
```

### Wrap Async Operations

Use a wrapper to convert promise rejections into `Result` tuples.

#### Correct

```ts
async function attemptAsync<T, E = unknown>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    return [null, await fn()]
  } catch (error) {
    return [error as E, null]
  }
}

// Usage — destructure the tuple
const [readError, contents] = await attemptAsync(() => readFile(configPath))

if (readError) {
  console.error('Read failed:', readError)
  return
}

// contents is typed as string (or whatever readFile returns)
processContents(contents)
```

### Define Domain-Specific Results

Create type aliases for consistency within a domain. This keeps function signatures short and error types discoverable.

#### Correct

```ts
// types.ts
interface ConfigError {
  type: 'invalid_toml' | 'missing_field' | 'unknown_workspace'
  message: string
  details?: unknown
}

export type ConfigResult<T> = Result<T, ConfigError>

// implementation
function loadConfig(path: string): ConfigResult<LaufConfig> {
  // returns [ConfigError, null] on failure or [null, LaufConfig] on success
}
```

### Chain Results with Early Returns

Use early returns to chain multiple Result-producing steps. Each step bails out on the first error.

#### Correct

```ts
async function runScript(name: string, workspace: string): Promise<Result<RunOutput, ScriptError>> {
  // Step 1: Load config
  const [configError, config] = loadConfig(workspace)
  if (configError) return [configError, null]

  // Step 2: Resolve script
  const [resolveError, script] = resolveScript(config, name)
  if (resolveError) return [resolveError, null]

  // Step 3: Execute
  const [execError, output] = await execute(script)
  if (execError) return [execError, null]

  return [null, output]
}
```

### Handle Multiple Error Types

Use destructuring and early returns to handle different error types. For exhaustive handling of multiple error variants, combine with `ts-pattern`.

#### Correct

```ts
const [error, config] = loadConfig(path)

if (error) {
  match(error.type)
    .with('invalid_toml', () => {
      logger.warn('Invalid TOML in config file')
    })
    .with('missing_field', () => {
      logger.warn('Missing required field')
    })
    .with('unknown_workspace', () => {
      logger.warn('Unknown workspace')
    })
    .exhaustive()
  return
}

applyConfig(config)
```

### Never Throw in Result-Returning Functions

A function that declares `Result` as its return type must never throw. All failure paths must return an error tuple.

#### Correct

```ts
function parse(json: string): Result<Data, ParseError> {
  if (!json) {
    return [{ type: 'parse_error', message: 'Empty input' }, null]
  }
  return [null, JSON.parse(json)]
}
```

#### Incorrect

```ts
function parse(json: string): Result<Data, ParseError> {
  if (!json) {
    throw new Error('Empty input') // Don't throw!
  }
  return [null, JSON.parse(json)]
}
```

### Always Check Results Before Accessing Values

Never access the value element without first confirming the error element is `null`. Destructure the tuple and check the error before using the value.

#### Correct

```ts
const [error, config] = parseConfig(input)
if (!error) {
  processConfig(config)
}
```

#### Incorrect

```ts
const [, config] = parseConfig(input)
processConfig(config) // config might be null — error was not checked
```

## References

- [Types](./types.md) -- Discriminated union patterns
- [Conditionals](./conditionals.md) -- ts-pattern for error handling
