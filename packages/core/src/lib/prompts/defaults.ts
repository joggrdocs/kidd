import { createPromptUtils, createSpinner } from './create-prompts.js'
import type { PromptUtils, Spinner } from './types.js'

/**
 * Default spinner instance.
 */
export const spinner: Spinner = createSpinner()

/**
 * Default prompt utilities instance.
 */
export const prompts: PromptUtils = createPromptUtils()
