import type * as clack from '@clack/prompts'

/**
 * Terminal spinner for indicating long-running operations.
 */
export interface Spinner {
  start(message?: string): void
  stop(message?: string): void
  message(message: string): void
}

/**
 * Interactive prompt methods backed by @clack/prompts.
 */
export interface PromptUtils {
  select<TValue>(
    opts: Omit<Parameters<typeof clack.select<TValue>>[0], 'output'>
  ): ReturnType<typeof clack.select<TValue>>
  confirm(
    opts: Omit<Parameters<typeof clack.confirm>[0], 'output'>
  ): ReturnType<typeof clack.confirm>
  text(opts: Omit<Parameters<typeof clack.text>[0], 'output'>): ReturnType<typeof clack.text>
  multiselect<TValue>(
    opts: Omit<Parameters<typeof clack.multiselect<TValue>>[0], 'output'>
  ): ReturnType<typeof clack.multiselect<TValue>>
  password(
    opts: Omit<Parameters<typeof clack.password>[0], 'output'>
  ): ReturnType<typeof clack.password>
  isCancel(value: unknown): value is symbol
  cancel(message?: string): void
}
