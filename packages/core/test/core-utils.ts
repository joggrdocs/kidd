/**
 * Re-exports test utilities from `@kidd-cli/core/test` for internal test use.
 *
 * New tests should import from `@kidd-cli/core/test` directly.
 * This file exists for backward compatibility with existing test imports.
 */
export {
  createTestContext,
  createWritableCapture,
  mockPrompts,
  normalizeError,
  runCommand,
  runHandler,
  runMiddleware,
  setupTestLifecycle,
  stripAnsi,
} from '@/test/index.js'
export type {
  CommandResult,
  HandlerResult,
  MiddlewareResult,
  PromptResponses,
  RunCommandOptions,
  TestContextOptions,
  TestContextResult,
  TestLifecycle,
  WritableCapture,
} from '@/test/index.js'

import type { CliOptions } from '@/types.js'

/**
 * Override process.argv for CLI testing.
 */
export function setArgv(...args: readonly string[]): void {
  process.argv = ['node', 'test', ...args]
}

/**
 * Run the CLI and wait for async completion.
 */
export async function runTestCli(options: CliOptions): Promise<void> {
  const { cli } = await import('@/cli.js')
  await cli(options)
}
