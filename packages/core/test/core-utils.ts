/**
 * Re-exports test utilities from `@kidd-cli/core/test` for internal test use.
 */
export {
  createTestContext,
  createWritableCapture,
  mockPrompts,
  normalizeError,
  runCommand,
  runHandler,
  runMiddleware,
  runTestCli,
  setArgv,
  setupTestLifecycle,
  stripAnsi,
} from '@/test/index.js'
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
} from '@/test/index.js'
