import { createOutput } from './create-output.js'
import type { CliOutput } from './types.js'

/**
 * Default output instance writing to stdout.
 */
export const output: CliOutput = createOutput()
