# Testing Your CLI

kidd ships test utilities at `@kidd-cli/core/test` so you can test commands, middleware, and full CLI pipelines without mocking `@clack/prompts` or wiring up streams by hand.

## Install

The utilities live inside `@kidd-cli/core` — no extra package required:

```ts
import {
  createTestContext,
  runHandler,
  runMiddleware,
  runCommand,
  mockPrompts,
} from '@kidd-cli/core/test'
```

## Unit Testing Commands

Use `runHandler` to execute a single command handler in isolation:

```ts
import { describe, expect, it } from 'vitest'
import { command } from '@kidd-cli/core'
import { runHandler } from '@kidd-cli/core/test'

const greet = command({
  handler(ctx) {
    ctx.log.raw(`Hello, ${ctx.args.name}!`)
  },
})

describe('greet', () => {
  it('should greet the user by name', async () => {
    const { stdout } = await runHandler(greet, { args: { name: 'Alice' } })
    expect(stdout()).toBe('Hello, Alice!\n')
  })

  it('should capture ctx.fail errors', async () => {
    const failCmd = command({
      handler(ctx) {
        ctx.fail('missing name')
      },
    })
    const { error } = await runHandler(failCmd)
    expect(error?.message).toBe('missing name')
  })
})
```

## Unit Testing Middleware

Use `runMiddleware` to execute a middleware chain with a test context:

```ts
import { describe, expect, it } from 'vitest'
import { middleware, decorateContext } from '@kidd-cli/core'
import { runMiddleware } from '@kidd-cli/core/test'

const loadUser = middleware(async (ctx, next) => {
  decorateContext(ctx, 'user', { id: 'u-1', name: 'Alice' })
  await next()
})

describe('loadUser', () => {
  it('should decorate context with user', async () => {
    const { ctx } = await runMiddleware([loadUser])
    expect(ctx.user).toEqual({ id: 'u-1', name: 'Alice' })
  })
})
```

## Testing with Prompts

Use `mockPrompts` to pre-program prompt responses without touching `@clack/prompts`:

```ts
import { describe, expect, it } from 'vitest'
import { command } from '@kidd-cli/core'
import { runHandler, mockPrompts } from '@kidd-cli/core/test'

const deploy = command({
  async handler(ctx) {
    const confirmed = await ctx.log.confirm({ message: 'Deploy to production?' })
    if (confirmed) {
      ctx.log.raw('Deploying...')
    }
  },
})

describe('deploy', () => {
  it('should deploy when confirmed', async () => {
    const prompts = mockPrompts({ confirm: [true] })
    const { stdout } = await runHandler(deploy, { prompts })
    expect(stdout()).toContain('Deploying...')
  })

  it('should skip deploy when denied', async () => {
    const prompts = mockPrompts({ confirm: [false] })
    const { stdout } = await runHandler(deploy, { prompts })
    expect(stdout()).toBe('')
  })
})
```

`mockPrompts` accepts queues for each prompt type. Responses are consumed in order:

```ts
const prompts = mockPrompts({
  confirm: [true, false], // First confirm returns true, second returns false
  text: ['Alice', 'admin'], // First text returns 'Alice', second returns 'admin'
  select: ['production'], // First select returns 'production'
  multiselect: [['a', 'b']], // First multiselect returns ['a', 'b']
  password: ['secret123'], // First password returns 'secret123'
})
```

## Building a Test Context Manually

Use `createTestContext` when you need a context without running a handler:

```ts
import { createTestContext } from '@kidd-cli/core/test'

const { ctx, stdout } = createTestContext({
  args: { name: 'Alice', verbose: true },
  config: { apiUrl: 'https://api.example.com' },
  meta: { command: ['deploy'], name: 'my-cli', version: '1.0.0' },
})

ctx.log.raw('hello')
expect(stdout()).toBe('hello\n')
```

## Integration Testing

Use `runCommand` to test the full CLI pipeline including arg parsing, middleware, and handlers:

```ts
import { describe, expect, it } from 'vitest'
import { command } from '@kidd-cli/core'
import { runCommand } from '@kidd-cli/core/test'

const greet = command({
  args: { name: { type: 'string', required: true } },
  handler(ctx) {
    ctx.log.raw(`Hello, ${ctx.args.name}!`)
  },
})

describe('CLI integration', () => {
  it('should parse args and run the handler', async () => {
    const { exitCode } = await runCommand({
      args: ['greet', '--name', 'Alice'],
      commands: { greet },
    })
    expect(exitCode).toBeUndefined() // No exit = success
  })
})
```

## Test Lifecycle

Use `setupTestLifecycle` to automatically save/restore `process.argv` and stub `process.exit` between tests:

```ts
import { setupTestLifecycle } from '@kidd-cli/core/test'

const lifecycle = setupTestLifecycle()

it('should exit with code 1 on error', async () => {
  // ... run CLI that triggers an error ...
  expect(lifecycle.getExitSpy()).toHaveBeenCalledWith(1)
})
```

## API Reference

| Function                                 | Purpose                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `createTestContext(overrides?)`          | Create a fully-mocked Context with captured output                   |
| `runHandler(command, overrides?)`        | Execute a single command handler in isolation                        |
| `runMiddleware(middlewares, overrides?)` | Execute a middleware chain with a no-op terminal handler             |
| `runCommand(options)`                    | Execute a full CLI pipeline in-process                               |
| `mockPrompts(responses)`                 | Create a Prompts implementation with pre-programmed responses        |
| `setupTestLifecycle()`                   | Wire up beforeEach/afterEach hooks for process.argv and process.exit |
| `createWritableCapture()`                | Create a writable stream that captures output to a string buffer     |
