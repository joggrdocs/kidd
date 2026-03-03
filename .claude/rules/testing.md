---
paths:
  - '**/*.test.ts'
---

# Testing Rules

All tests use [Vitest](https://vitest.dev). Follow these conventions in every test file.

## Structure

- Place test files in `test/` directory within the package (e.g., `packages/js/test/verifier.test.ts`)
- Name `describe` blocks after the module or function under test
- Name test cases as `should + expected behavior`
- One assertion focus per test case

```ts
import { describe, it, expect } from 'vitest'

describe('resolveScript', () => {
  it('should resolve path relative to workspace root', () => {
    const result = resolveScriptPath('build', '/project')
    expect(result).toBe('/project/scripts/build.ts')
  })
})
```

## Mocking

- Use `vi.mock` for module-level mocks and `vi.fn` for individual functions
- Mock all external I/O (file system, network, timers)
- Reset mocks in `beforeEach` with `vi.clearAllMocks()`
- Use `vi.mocked()` for type-safe mock access

## Organization

- Group related tests with nested `describe` blocks
- Use `beforeEach` for shared setup, never shared mutable state across tests
- Delete or fix skipped tests — never leave `it.skip` without a reason

## Error Testing

- Test Result tuples by destructuring `[error, value]`
- Assert the error element before accessing the value
- Use `toMatchObject` for partial matching on error shapes

```ts
it('should return error result for missing config', async () => {
  const [error] = await loadConfig('/missing')
  expect(error).toMatchObject({ type: 'parse_error' })
})
```

## Coverage Targets

| Area | Minimum |
|---|---|
| Critical paths (config, auth) | 100% |
| Business logic | 80% |
| Utilities | 70% |

## Anti-patterns

- Do not test implementation details — test behavior and outcomes
- Do not test framework code — trust dependencies
- Do not use shared mutable state between tests
- Do not create large monolithic test files — split by feature
