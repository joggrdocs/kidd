import { toError } from './predicates.js'

/**
 * A Result tuple representing either success `[null, TValue]` or failure `[TError, null]`.
 * Used throughout the codebase as the standard error-handling mechanism instead of throw.
 */
export type Result<TValue, TError = Error> = readonly [TError, null] | readonly [null, TValue]

/**
 * A Promise that resolves to a {@link Result} tuple.
 */
export type AsyncResult<TValue, TError = Error> = Promise<Result<TValue, TError>>

/**
 * Construct a success Result tuple.
 *
 * When called with no arguments, returns a void success `[null, undefined]`.
 *
 * @param value - The success value (optional).
 * @returns A Result tuple `[null, value]`.
 */
export function ok(): Result<void, never>
export function ok<TValue>(value: TValue): Result<TValue, never>
export function ok<TValue>(value?: TValue): Result<TValue | void, never> {
  return [null, value as TValue | void]
}

/**
 * Construct a failure Result tuple.
 *
 * Coerces any value to an `Error` via {@link toError} and returns `[Error, null]`.
 * For domain-specific error types (e.g. `AuthError`, `IconsError`), use raw
 * tuple literals instead: `[domainError, null] as const`.
 *
 * @param error - The error value (coerced to Error).
 * @returns A Result tuple `[Error, null]`.
 */
export function err(error: unknown): Result<never> {
  return [toError(error), null]
}
