import type { Result } from '@kidd-cli/utils'
import { validate } from '@kidd-cli/utils/validate'
import { z } from 'zod'

import type { KiddConfig } from '../types.js'
import type { CompileTarget } from './compile.js'
import { compileTargets } from './compile.js'

/**
 * @private
 */
const compileTargetValues = compileTargets.map((entry) => entry.target) as [
  CompileTarget,
  ...CompileTarget[],
]

/**
 * @private
 */
const CompileTargetSchema = z.enum(compileTargetValues)

/**
 * @private
 */
const BuildOptionsSchema = z
  .object({
    clean: z.boolean().optional(),
    define: z.record(z.string(), z.string()).optional(),
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
    autoloadDotenv: z.boolean().optional(),
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
  return validate({
    schema: KiddConfigSchema,
    params: data,
    createError: ({ message }) => new Error(`Invalid kidd config:\n  ${message}`),
  })
}
