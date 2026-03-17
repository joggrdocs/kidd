import { cli } from '@kidd-cli/core'

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
} from '@kidd-cli/core/test'
export type {
  CommandResult,
  HandlerResult,
  MiddlewareResult,
  PromptResponses,
  RunCommandOptions,
  RunHandlerOptions,
  RunMiddlewareOptions,
  TestContextOptions,
  TestContextResult,
  TestLifecycle,
  WritableCapture,
} from '@kidd-cli/core/test'

/**
 * Override process.argv for CLI testing.
 */
export function setArgv(...args: readonly string[]): void {
  process.argv = ['node', 'test', ...args]
}

/**
 * Run the CLI and wait for async completion.
 */
export async function runTestCli(options: Parameters<typeof cli>[0]): Promise<void> {
  await cli(options)
}
