import type { ZodError, ZodTypeAny, output } from 'zod'

/**
 * A single formatted Zod validation issue with a dot-joined path.
 */
export interface ZodIssue {
  readonly path: string
  readonly message: string
}

/**
 * Factory that converts a ZodError into an application-specific Error.
 */
export type ValidationErrorFactory = (error: ZodError) => Error

/**
 * Result type for validation operations.
 */
export type ValidationResult<TValue> = readonly [Error, null] | readonly [null, TValue]

/**
 * Format Zod validation issues into structured objects and a human-readable string.
 *
 * @param issues - Raw Zod validation issues.
 * @returns An object containing the formatted issues array and a joined message string.
 */
export function formatZodIssues(
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
      if (item.path) {
        return `${item.path}: ${item.message}`
      }
      return item.message
    })
    .join(separator)
  return { issues: formatted, message }
}

/**
 * Validate unknown input against a Zod schema.
 *
 * @param schema - The Zod schema to validate against.
 * @param params - The unknown value to validate.
 * @param createValidationError - Factory invoked when validation fails.
 * @returns A Result tuple - either [Error, null] on failure or [null, T] on success.
 */
export function validate<TSchema extends ZodTypeAny>(
  schema: TSchema,
  params: unknown,
  createValidationError: ValidationErrorFactory
): ValidationResult<output<TSchema>> {
  const result = schema.safeParse(params)
  if (!result.success) {
    return [createValidationError(result.error), null]
  }
  return [null, result.data]
}
