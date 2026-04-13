# Build a Diagnostic Command

Create a diagnostic command that reports checks, findings, and summaries using the report middleware.

## Prerequisites

- An existing kidd CLI project
- `@kidd-cli/core` installed (`pnpm add @kidd-cli/core`)

## Steps

### 1. Register the report middleware

Import `report` from `@kidd-cli/core/report` and add it to the `middleware` array in `cli()`:

```ts
import { cli } from '@kidd-cli/core'
import { report } from '@kidd-cli/core/report'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [report()],
  commands: `${import.meta.dirname}/commands`,
})
```

Importing `@kidd-cli/core/report` automatically augments `CommandContext` with `readonly report: Report`. No manual type augmentation is needed.

### 2. Write check rows

Use `ctx.report.check()` to write pass/fail/warn/skip/fix rows. Each check takes a `status` and a `name`, with optional `detail`, `duration`, and `hint` fields:

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Check project health',
  handler: async (ctx) => {
    ctx.report.check({ status: 'pass', name: 'package.json' })
    ctx.report.check({ status: 'pass', name: 'tsconfig.json' })
    ctx.report.check({ status: 'fail', name: '.env', detail: 'missing required keys' })
    ctx.report.check({ status: 'warn', name: 'node_modules', hint: 'run pnpm install' })
    ctx.report.check({ status: 'skip', name: '.eslintrc' })
    ctx.report.check({ status: 'pass', name: 'tests/unit.ts', duration: 142 })
  },
})
```

Terminal output:

```
  PASS  package.json
  PASS  tsconfig.json
  FAIL  .env  missing required keys
  WARN  node_modules  (run pnpm install)
  SKIP  .eslintrc
  PASS  tests/unit.ts  (142ms)
```

### 3. Write findings with code frames

Use `ctx.report.finding()` for lint-style diagnostics. Each finding has a `severity`, `rule`, and `message`, with optional `category`, `help`, and `frame` fields:

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

Terminal output:

```
  x no-unused-vars  correctness
  |
  |  'config' is defined but never used
  |
  |  --> src/index.ts:1:10
  |
  | 1 | import { config } from './config.js'
  |   |          ^^^^^^ this variable is unused
  | 2 | import { run } from './run.js'
  |
  |  help: Remove the unused variable or prefix with _
```

Findings without a `frame` render as a simpler message block.

### 4. Write a summary

Use `ctx.report.summary()` to write a summary at the end of the diagnostic output. Two styles are available:

**Tally style** -- aligned multi-row summary:

```ts
ctx.report.summary({
  style: 'tally',
  stats: [
    { label: 'Checks', value: '4 passed | 1 failed | 1 warned (6)' },
    { label: 'Findings', value: '1 error' },
    { label: 'Duration', value: '0.34s' },
  ],
})
```

Terminal output:

```
  Checks    4 passed | 1 failed | 1 warned (6)
  Findings  1 error
  Duration  0.34s
```

**Inline style** -- pipe-separated one-liner:

```ts
ctx.report.summary({
  style: 'inline',
  stats: ['1 error', '1 warning', '6 checks', 'in 340ms'],
})
```

Terminal output:

```
  1 error | 1 warning | 6 checks | in 340ms
```

### 5. Build a complete diagnostic command

Combine checks, findings, and a summary into a full diagnostic command:

```ts
import { command } from '@kidd-cli/core'
import { existsSync } from 'node:fs'

export default command({
  description: 'Run project diagnostics',
  handler: async (ctx) => {
    ctx.log.intro('Project Diagnostics')

    const files = ['package.json', 'tsconfig.json', '.env', '.gitignore']
    const results = files.map((file) => ({
      name: file,
      exists: existsSync(file),
    }))

    const passed = results.filter((r) => r.exists)
    const failed = results.filter((r) => !r.exists)

    results.map((r) =>
      ctx.report.check({
        status: r.exists ? 'pass' : 'fail',
        name: r.name,
        detail: r.exists ? undefined : 'not found',
      })
    )

    failed.map((r) =>
      ctx.report.finding({
        severity: 'error',
        rule: 'file-exists',
        message: `Required file ${r.name} is missing`,
        help: `Create ${r.name} in the project root`,
      })
    )

    ctx.report.summary({
      style: 'tally',
      stats: [
        { label: 'Checks', value: `${String(passed.length)} passed | ${String(failed.length)} failed (${String(results.length)})` },
      ],
    })

    ctx.log.outro('Diagnostics complete')
  },
})
```

### 6. Use a custom output stream

By default, report output writes to `process.stderr`. To write to a different stream:

```ts
import { createWriteStream } from 'node:fs'

report({
  output: createWriteStream('diagnostics.log'),
})
```

### 7. Use createReport for standalone scripts

For diagnostic output outside the middleware pipeline, use `createReport()` directly:

```ts
import { createReport } from '@kidd-cli/core/report'

const report = createReport()
report.check({ status: 'pass', name: 'config.json' })
report.summary({ style: 'inline', stats: ['1 passed', '0 failed'] })
```

## Verification

Run the diagnostic command and inspect the terminal output:

```bash
npx my-app doctor
```

Expected output includes colored check rows, any findings with code frames, and a summary block at the end.

## Troubleshooting

### ctx.report is undefined

**Issue:** Accessing `ctx.report` throws a runtime error.

**Fix:** Ensure the `report()` middleware is registered in the `middleware` array of `cli()`. The middleware must run before the command handler to decorate the context.

### Report output goes to stderr

**Issue:** Report output does not appear when piping stdout.

**Fix:** Report output writes to `process.stderr` by default. This is intentional so diagnostic output does not interfere with data piped through stdout. To redirect, pass a custom `output` stream to `report()`.

### Check rows appear unstyled

**Issue:** Check status labels (PASS, FAIL) appear without color.

**Fix:** Ensure your terminal supports ANSI color codes. If running in CI, set `FORCE_COLOR=1` to enable colored output. Some CI environments strip ANSI codes by default.

## References

- [Reporting Concepts](/docs/concepts/reporting)
- [Build a CLI](./build-a-cli.md)
- [Context](/docs/concepts/context)
- [Core Reference](/reference/packages/kidd)
