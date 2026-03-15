# Diagnostic Output

Demonstrates the `ctx.output` format methods for displaying linting, testing, and diagnostic results in the terminal.

## Commands

| Command    | What it shows                                                         |
| ---------- | --------------------------------------------------------------------- |
| `dx lint`  | Diagnostic findings with code frames, help text, and a summary footer |
| `dx test`  | Test results with pass/fail/skip rows and a tally summary             |
| `dx check` | Combined lint + test output in a single command                       |

## Output Methods Used

- `ctx.output.diagnostic()` -- full lint finding with severity, rule, code frame, and help text
- `ctx.output.codeFrame()` -- standalone annotated code snippet
- `ctx.output.result()` -- single pass/fail/warn/skip/fix row
- `ctx.output.summary({ style: 'tally' })` -- labeled stat rows (e.g. Tests, Suites, Duration)
- `ctx.output.summary({ style: 'inline' })` -- pipe-separated one-liner stats footer
- `ctx.colors` -- color formatting for summary values and terminal text

## Structure

```
examples/diagnostic-output/
├── kidd.config.ts           # CLI build config
├── src/
│   ├── index.ts             # CLI entry point
│   └── commands/
│       ├── lint.ts           # Linter output demo
│       ├── test.ts           # Test runner output demo
│       └── check.ts          # Combined lint + test demo
```
