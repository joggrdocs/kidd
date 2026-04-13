# Reporting

Structured terminal output for diagnostic commands. The report middleware decorates `ctx.report` with methods for writing checks, findings, and summaries.

## Setup

Register the `report()` middleware in your CLI bootstrap:

```ts
import { cli } from '@kidd-cli/core'
import { report } from '@kidd-cli/core/report'

cli({
  name: 'my-tool',
  version: '1.0.0',
  middleware: [report()],
  commands: import.meta.dirname + '/commands',
})
```

The middleware accepts optional configuration:

| Option   | Type                    | Default          | Description                                       |
| -------- | ----------------------- | ---------------- | ------------------------------------------------- |
| `output` | `NodeJS.WritableStream` | `process.stderr` | Output stream for report output                   |
| `report` | `Report`                | --               | Custom Report implementation (useful for testing) |

## Report API

Once registered, `ctx.report` provides three methods:

### `ctx.report.check(input)`

Write a single pass/fail/warn/skip/fix check row. Useful for test results, linter checks, or diagnostic steps.

```ts
ctx.report.check({ status: 'pass', name: 'src/index.ts' })
ctx.report.check({ status: 'fail', name: 'src/config.ts', detail: 'missing export' })
ctx.report.check({ status: 'warn', name: 'src/utils.ts', hint: 'consider splitting' })
ctx.report.check({ status: 'skip', name: 'src/legacy.ts' })
ctx.report.check({ status: 'fix', name: 'src/format.ts', detail: 'auto-fixed' })
ctx.report.check({ status: 'pass', name: 'tests/unit.ts', duration: 142 })
```

**Output:**

```txt
 ✔ src/index.ts
 ✘ src/config.ts missing export
 ⚠ src/utils.ts [consider splitting]
 ○ src/legacy.ts
 ◆ src/format.ts auto-fixed
 ✔ tests/unit.ts (142ms)
```

See the [report() reference](/reference/middleware/report) for all input fields.

### `ctx.report.finding(input)`

Write a finding with optional code frame. Models a lint error, warning, or hint with source location.

```ts
ctx.report.finding({
  severity: 'error',
  rule: 'no-unused-vars',
  message: "'config' is defined but never used",
  category: 'correctness',
  help: 'Remove the unused variable or prefix with _',
  frame: {
    filePath: 'src/index.ts',
    lines: ["import { config } from './config.js'", "import { run } from './run.js'"],
    startLine: 1,
    annotation: {
      line: 1,
      column: 10,
      length: 6,
      message: 'this variable is unused',
    },
  },
})
```

**Output:**

```txt
  error (correctness): 'config' is defined but never used [no-unused-vars]
  ❯ src/index.ts:1:10
    │
  1 │ import { config } from './config.js'
    │          ^^^^^^ this variable is unused
  2 │ import { run } from './run.js'
    │
  ╰─ help: Remove the unused variable or prefix with _
```

See the [report() reference](/reference/middleware/report) for all input fields.

### `ctx.report.summary(input)`

Write a summary block or inline stats. Two styles are available:

**Block style (`'tally'`)** -- aligned multi-row summary:

```ts
ctx.report.summary({
  style: 'tally',
  stats: [
    { label: 'Tests', value: '3 passed | 2 failed (5)' },
    { label: 'Duration', value: '5.63s' },
  ],
})
```

**Output:**

```txt
  Tests     3 passed | 2 failed (5)
  Duration  5.63s
```

**Inline style** -- pipe-separated one-liner:

```ts
ctx.report.summary({
  style: 'inline',
  stats: ['1 error', '3 warnings', '95 files', 'in 142ms'],
})
```

**Output:**

```txt
  1 error | 3 warnings | 95 files | in 142ms
```

See the [report() reference](/reference/middleware/report) for all input fields.

## Standalone usage

Use `createReport()` outside the middleware pipeline for scripts or standalone tools:

```ts
import { createReport } from '@kidd-cli/core/report'

const report = createReport()
report.check({ status: 'pass', name: 'config.json' })
report.summary({ style: 'inline', stats: ['1 passed', '0 failed'] })
```

## Full example

A diagnostic command that checks project files and reports results:

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Check project health',
  async handler(ctx) {
    ctx.report.check({ status: 'pass', name: 'package.json' })
    ctx.report.check({ status: 'pass', name: 'tsconfig.json' })
    ctx.report.check({ status: 'fail', name: '.env', detail: 'missing required keys' })

    ctx.report.finding({
      severity: 'warning',
      rule: 'env-required',
      message: 'Missing DATABASE_URL in .env',
      help: 'Add DATABASE_URL=postgres://... to your .env file',
    })

    ctx.report.summary({
      style: 'tally',
      stats: [{ label: 'Checks', value: '2 passed | 1 failed (3)' }],
    })
  },
})
```

## Module augmentation

When using the report middleware, augment the CommandContext interface to get type-safe access:

```ts
import type { Report } from '@kidd-cli/core/report'

declare module '@kidd-cli/core' {
  interface CommandContext {
    readonly report: Report
  }
}
```

## References

- [Context](./context.md)
- [Lifecycle](./lifecycle.md)
- [report() Reference](/reference/middleware/report)
- [Core](/reference/packages/kidd)
- [Build a Diagnostic Command](/guides/build-a-diagnostic-command)
