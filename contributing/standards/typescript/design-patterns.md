# Design Patterns

## Overview

Concrete patterns for structuring code in a functional TypeScript codebase. Use factories to encapsulate state, pipelines to transform data, and composition to combine behaviors. For the underlying constraints (no classes, no `let`, no `throw`, etc.) see [Coding Style](./coding-style.md).

## Rules

### Use Factories Over Classes

Use factory functions to encapsulate state instead of classes. Factories avoid `this` confusion, do not require the `new` keyword, keep private state truly private through closures, and can return different implementations from the same interface.

#### Correct

```ts
interface Runner {
  run: (script: string) => Promise<RunResult>
  stop: () => void
  isRunning: () => boolean
}

function createRunner(config: RunnerConfig): Runner {
  let running = false

  return {
    run: async (script) => {
      running = true
      const result = await execute(script, config)
      running = false
      return result
    },
    stop: () => {
      running = false
    },
    isRunning: () => running,
  }
}

// Usage
const runner = createRunner({ timeout: 5000 })
await runner.run('build')
```

```ts
// Factory can return different implementations
function createLogger(env: 'dev' | 'prod') {
  if (env === 'dev') {
    return {
      log: (msg: string) => console.log(`[DEV] ${msg}`),
    }
  }

  return {
    log: (msg: string) => sendToLogService(msg),
  }
}
```

#### Incorrect

```ts
class Runner {
  private running = false

  constructor(private config: RunnerConfig) {}

  async run(script: string) {
    this.running = true
    const result = await execute(script, this.config)
    this.running = false
    return result
  }
}

const runner = new Runner({ timeout: 5000 })
const fn = runner.run
fn('build') // `this` is lost!
```

### Transform Data Through Pipelines

Transform data through pure pipelines. Avoid shared mutable state by returning new values at each step.

#### Correct

```ts
// Data flows through transformations
const result = scripts
  .filter((script) => script.enabled)
  .map((script) => script.name)
  .join(', ')

// Explicit transformations
function processConfig(raw: RawConfig): ProcessedConfig {
  const parsed = parseToml(raw.content)
  const validated = validateSchema(parsed)
  const resolved = resolvePaths(validated)
  return resolved
}
```

#### Incorrect

```ts
// Mutating shared state
const scripts: Script[] = []

function addScript(script: Script) {
  scripts.push(script) // Mutation!
}

// Return new state instead
function addScript(scripts: readonly Script[], script: Script): Script[] {
  return [...scripts, script]
}
```

### Prefer Composition Over Inheritance

Combine small, focused interfaces and factory functions instead of building inheritance hierarchies. Composition lets you mix behaviors without coupling.

#### Correct

```ts
interface Runnable {
  run: () => Promise<void>
}

interface Configurable {
  configure: (config: Record<string, unknown>) => void
}

function createTask(name: string): Runnable & Configurable {
  let taskConfig: Record<string, unknown> = {}

  return {
    run: async () => {
      await execute(name, taskConfig)
    },
    configure: (config) => {
      taskConfig = { ...config }
    },
  }
}
```

#### Incorrect

```ts
// Deep inheritance hierarchy
class Task {
  run() {}
}

class ConfigurableTask extends Task {
  configure() {}
}

class ScheduledConfigurableTask extends ConfigurableTask {
  schedule() {}
}
```

## References

- [Coding Style](./coding-style.md) -- Constraints (no classes, no let, no throw, etc.)
- [State](./state.md) -- State management patterns
- [Functions](./functions.md) -- Pure function guidelines
