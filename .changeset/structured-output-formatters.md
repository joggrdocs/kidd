---
'@kidd-cli/core': minor
---

Redesign output API: replace `ctx.output` with `ctx.format` and add styled logger methods.

**Breaking changes:**

- Remove `ctx.output` from the Context (replaced by `ctx.format` and `ctx.logger`)
- Rename `SYMBOLS`/`Symbols` to `GLYPHS`/`Glyphs`
- Rename format types: `ResultInput` to `CheckInput`, `DiagnosticInput` to `FindingInput`, `SummaryInput` to `TallyInput`, `TallySummaryInput` to `TallyBlockInput`, `InlineSummaryInput` to `TallyInlineInput`, `ResultStatus` to `CheckStatus`, `DiagnosticSeverity` to `FindingSeverity`
- Rename format functions: `formatResult` to `formatCheck`, `formatDiagnostic` to `formatFinding`, `formatSummary` to `formatTally`

**New features:**

- Add `ctx.format.json(data)` and `ctx.format.table(rows)` — pure string formatters (no I/O)
- Add `ctx.logger.check(input)` — write a pass/fail/warn/skip/fix row (vitest style)
- Add `ctx.logger.finding(input)` — write a full finding with optional code frame (oxlint style)
- Add `ctx.logger.tally(input)` — write a tally block or inline stats footer

**Migration:**

```ts
// Before
ctx.output.result(input) // → ctx.logger.check(input)
ctx.output.diagnostic(input) // → ctx.logger.finding(input)
ctx.output.summary(input) // → ctx.logger.tally(input)
ctx.output.write(data) // → process.stdout.write(ctx.format.json(data))
ctx.output.table(rows) // → process.stdout.write(ctx.format.table(rows))
ctx.output.raw(text) // → ctx.logger.print(text)
ctx.output.markdown(text) // → ctx.logger.print(text)
```
