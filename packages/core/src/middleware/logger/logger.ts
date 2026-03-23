/**
 * Logger middleware factory.
 *
 * Decorates `ctx.log` with a unified logging, prompting, and spinner API
 * backed by `@clack/prompts`.
 *
 * @module
 */

import * as clack from '@clack/prompts'

import { decorateContext } from '@/context/decorate.js'
import { middleware } from '@/middleware.js'
import type { Middleware } from '@/types/index.js'

import { createLog } from './log.js'
import type { LoggerEnv, LoggerOptions } from './types.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a logger middleware that decorates `ctx.log`.
 *
 * Provides structured terminal output (info, warn, error, step, etc.),
 * interactive prompts with cancel-signal unwrapping, and spinner
 * management through a single unified API on `ctx.log`.
 *
 * @param options - Optional middleware configuration.
 * @returns A Middleware instance that adds `ctx.log`.
 *
 * @example
 * ```ts
 * import { logger } from '@kidd-cli/core/logger'
 *
 * cli({
 *   middleware: [
 *     logger({ withGuide: true }),
 *   ],
 * })
 * ```
 */
export function logger(options?: LoggerOptions): Middleware<LoggerEnv> {
  const resolved = resolveOptions(options)

  return middleware<LoggerEnv>((ctx, next) => {
    if (resolved.withGuide) {
      clack.updateSettings({ withGuide: true })
    }

    const log = resolveLog(resolved)

    decorateContext(ctx, 'log', log)

    return next()
  })
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolved options with explicit defaults applied.
 *
 * @private
 */
interface ResolvedOptions {
  readonly withGuide: boolean
  readonly output: NodeJS.WritableStream | undefined
  readonly log: LoggerOptions['log']
}

/**
 * Extract options into a resolved shape, avoiding optional chaining.
 *
 * @private
 * @param options - Raw middleware options.
 * @returns Resolved options with defaults applied.
 */
function resolveOptions(options: LoggerOptions | undefined): ResolvedOptions {
  if (options === undefined) {
    return { log: undefined, output: undefined, withGuide: false }
  }

  return {
    log: options.log,
    output: options.output,
    withGuide: options.withGuide === true,
  }
}

/**
 * Resolve the Log instance from options, using a custom override or creating a new one.
 *
 * @private
 * @param resolved - The resolved middleware options.
 * @returns A Log instance.
 */
function resolveLog(
  resolved: ResolvedOptions
): LoggerOptions['log'] | ReturnType<typeof createLog> {
  if (resolved.log !== undefined) {
    return resolved.log
  }

  return createLog({ output: resolved.output })
}
