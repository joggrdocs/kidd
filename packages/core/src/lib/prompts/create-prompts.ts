import * as clack from '@clack/prompts'

import type { PromptUtils, Spinner } from './types.js'

/**
 * Create a new {@link Spinner} instance backed by @clack/prompts.
 */
export function createSpinner(): Spinner {
  const spinnerInstance = clack.spinner()

  return {
    message(msg: string): void {
      spinnerInstance.message(msg)
    },

    start(message?: string): void {
      spinnerInstance.start(message)
    },

    stop(message?: string): void {
      spinnerInstance.stop(message)
    },
  }
}

/**
 * Create a new {@link PromptUtils} instance backed by @clack/prompts.
 */
export function createPromptUtils(): PromptUtils {
  return {
    cancel(message?: string): void {
      clack.cancel(message)
    },

    confirm(
      opts: Omit<Parameters<typeof clack.confirm>[0], 'output'>
    ): ReturnType<typeof clack.confirm> {
      return clack.confirm(opts)
    },

    isCancel(value: unknown): value is symbol {
      return clack.isCancel(value)
    },

    multiselect<TValue>(
      opts: Omit<Parameters<typeof clack.multiselect<TValue>>[0], 'output'>
    ): ReturnType<typeof clack.multiselect<TValue>> {
      return clack.multiselect(opts)
    },

    password(
      opts: Omit<Parameters<typeof clack.password>[0], 'output'>
    ): ReturnType<typeof clack.password> {
      return clack.password(opts)
    },

    select<TValue>(
      opts: Omit<Parameters<typeof clack.select<TValue>>[0], 'output'>
    ): ReturnType<typeof clack.select<TValue>> {
      return clack.select(opts)
    },

    text(opts: Omit<Parameters<typeof clack.text>[0], 'output'>): ReturnType<typeof clack.text> {
      return clack.text(opts)
    },
  }
}
