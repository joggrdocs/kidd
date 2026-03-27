/**
 * Screen output system for rendering `ctx.log`, `ctx.status.spinner`, and
 * `ctx.report` inside React/Ink screen components.
 *
 * @module
 */

export { useOutputStore } from './use-output-store.js'

export { createOutputStore } from './store.js'
export { createScreenLog } from './screen-log.js'
export { createScreenReport } from './screen-report.js'
export { createScreenSpinner } from './screen-spinner.js'

export type {
  CheckEntry,
  FindingEntry,
  LogEntry,
  LogLevel,
  NewlineEntry,
  OutputEntry,
  OutputEntryInput,
  OutputSnapshot,
  OutputStore,
  OutputSubscriber,
  RawEntry,
  SpinnerState,
  SummaryEntry,
} from './types.js'
