import { toError } from '@kidd-cli/utils/fp'

/**
 * Build a descriptive error message for a failed tsdown operation.
 *
 * When verbose is false only a short header is returned. When verbose is true
 * the underlying error message is appended so callers get actionable detail.
 *
 * @param phase - The tsdown phase that failed (build or watch).
 * @param error - The error returned by tsdown (unknown from attemptAsync).
 * @param verbose - Whether to include the full error details.
 * @returns A formatted error message.
 */
export function formatBuildError(phase: 'build' | 'watch', error: unknown, verbose: boolean): string {
  const header = `tsdown ${phase} failed`

  if (!verbose) {
    return header
  }

  const detail = toError(error).message
  if (detail.trim().length > 0) {
    return `${header}\n${detail.trim()}`
  }

  return header
}
