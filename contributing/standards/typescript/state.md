# State Management

## Overview

Patterns for managing state immutably in TypeScript. All state transitions should produce new values rather than mutating existing ones, keeping side effects predictable and functions pure. These rules apply to any stateful module in the monorepo.

## Rules

### Create New State Instead of Mutating

State should never be mutated in place. Return new arrays and objects from every transformation.

#### Correct

```ts
function addItem(items: readonly Item[], newItem: Item): readonly Item[] {
  return [...items, newItem]
}

function updateItem(items: readonly Item[], id: string, updates: Partial<Item>): readonly Item[] {
  return items.map((item) => (item.id === id ? { ...item, ...updates } : item))
}

function removeItem(items: readonly Item[], id: string): readonly Item[] {
  return items.filter((item) => item.id !== id)
}
```

#### Incorrect

```ts
function addItem(items: Item[], newItem: Item) {
  items.push(newItem) // Mutation!
}

function updateItem(items: Item[], id: string, updates: Partial<Item>) {
  const item = items.find((i) => i.id === id)
  Object.assign(item, updates) // Mutation!
}
```

### Encapsulate State with Factories

Use factories and closures to encapsulate state. Never use classes. Mutation inside a closure is the accepted pattern for stateful modules — the public API should remain immutable.

#### Correct

```ts
function createCache<T>() {
  const cache = new Map<string, T>()

  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: T) => {
      cache.set(key, value)
    },
    has: (key: string) => cache.has(key),
    clear: () => cache.clear(),
  }
}

const configCache = createCache<ResolvedConfig>()
configCache.set('root', resolvedConfig)
```

#### Incorrect

```ts
class Cache<T> {
  private cache = new Map<string, T>()

  get(key: string) {
    return this.cache.get(key)
  }

  set(key: string, value: T) {
    this.cache.set(key, value)
  }
}
```

### Derive State, Don't Store Duplicates

Compute derived values from source state on demand. Never store values that can be calculated from existing state.

#### Correct

```ts
interface WorkspaceState {
  scripts: readonly Script[]
}

function getScriptCount(state: WorkspaceState): number {
  return state.scripts.length
}

function getScriptNames(state: WorkspaceState): readonly string[] {
  return state.scripts.map((s) => s.name)
}

// Usage - compute when needed
const count = getScriptCount(workspace)
const names = getScriptNames(workspace)
```

#### Incorrect

```ts
interface WorkspaceState {
  scripts: Script[]
  scriptCount: number // Derived - will get out of sync!
  scriptNames: string[] // Derived - will get out of sync!
}
```

## References

- [Design Patterns](./design-patterns.md) -- Factories and functional design
- [Functions](./functions.md) -- Pure functions
