import type { ZodTypeAny, output } from 'zod'

import type { Result } from './fp/result.js'
import { err, ok } from './fp/result.js'

/**
 * A single formatted Zod validation issue with a dot-joined path.
 */
export interface ZodIssue {
  readonly path: string
  readonly message: string
}

/**
 * Factory that converts formatted validation details into an application-specific Error.
 *
 * Receives the pre-formatted human-readable message and structured issues array
 * so callers can customize the Error without needing to format issues themselves.
 */
export type ValidationErrorFactory = (details: {
  readonly issues: readonly ZodIssue[]
  readonly message: string
}) => Error

/**
 * Result type for validation operations.
 */
export type ValidationResult<TValue> = Result<TValue>

/**
 * Validate unknown input against a Zod schema.
 *
 * When validation fails, issues are automatically formatted into a human-readable
 * message. If a `createError` factory is provided, it receives the formatted
 * issues and message. Otherwise, a plain `Error` with the formatted message is
 * returned.
 *
 * @param options - The validation options.
 * @param options.schema - The Zod schema to validate against.
 * @param options.params - The unknown value to validate.
 * @param options.createError - Optional factory invoked when validation fails.
 * @returns A Result tuple - either [Error, null] on failure or [null, T] on success.
 */
export function validate<TSchema extends ZodTypeAny>({
  schema,
  params,
  createError,
}: {
  readonly schema: TSchema
  readonly params: unknown
  readonly createError?: ValidationErrorFactory
}): ValidationResult<output<TSchema>> {
  const result = schema.safeParse(params)
  if (!result.success) {
    const formatted = formatZodIssues(result.error.issues)
    if (createError) {
      return err(createError(formatted))
    }
    return err(formatted.message)
  }
  return ok(result.data)
}

// ---------------------------------------------------------------------------

/**
 * Format raw Zod validation issues into structured objects and a human-readable string.
 *
 * @private
 * @param issues - Raw Zod validation issues.
 * @param separator - Separator between formatted issue strings.
 * @returns An object containing the formatted issues array and a joined message string.
 */
function formatZodIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
  separator = '\n  '
): { readonly issues: readonly ZodIssue[]; readonly message: string } {
  const formatted = issues.map(
    (issue: { path: PropertyKey[]; message: string }): ZodIssue => ({
      message: issue.message,
      path: issue.path.map(String).join('.'),
    })
  )
  const message = formatted
    .map((item: ZodIssue) => {
      if (item.path.length > 0) {
        return `${item.path}: ${item.message}`
      }
      return item.message
    })
    .join(separator)
  return { issues: formatted, message }
}
