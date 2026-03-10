import type { Result } from '@kidd-cli/utils'
import { err } from '@kidd-cli/utils/fp'
import { formatZodIssues } from '@kidd-cli/utils/validate'
import { z } from 'zod'

import type { KiddConfig } from './types.js'

/**
 * @private
 */
const CompileTargetSchema = z.enum([
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'linux-x64-musl',
  'windows-arm64',
  'windows-x64',
])

/**
 * @private
 */
const BuildOptionsSchema = z
  .object({
    external: z.array(z.string()).optional(),
    minify: z.boolean().optional(),
    out: z.string().optional(),
    sourcemap: z.boolean().optional(),
    target: z.string().optional(),
  })
  .strict()

/**
 * @private
 */
const CompileOptionsSchema = z
  .object({
    name: z.string().optional(),
    out: z.string().optional(),
    targets: z.array(CompileTargetSchema).optional(),
  })
  .strict()

/**
 * Zod schema validating the {@link KiddConfig} shape.
 */
export const KiddConfigSchema: z.ZodType<KiddConfig> = z
  .object({
    build: BuildOptionsSchema.optional(),
    commandOrder: z.array(z.string()).optional(),
    commands: z.string().optional(),
    compile: z.union([z.boolean(), CompileOptionsSchema]).optional(),
    entry: z.string().optional(),
    include: z.array(z.string()).optional(),
  })
  .strict()

/**
 * Validate arbitrary data against the {@link KiddConfigSchema}.
 *
 * @param data - The unknown value to validate.
 * @returns A Result tuple - `[null, KiddConfig]` on success or `[Error, null]` on failure.
 */
export function validateConfig(data: unknown): Result<KiddConfig, Error> {
  const result = KiddConfigSchema.safeParse(data)
  if (!result.success) {
    const { message } = formatZodIssues(result.error.issues)
    return err(`Invalid kidd config:\n  ${message}`)
  }
  return [null, result.data]
}
