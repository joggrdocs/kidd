import { command } from '@kidd-cli/core'

/**
 * Simulated test results for demonstration.
 */
const RESULTS = [
  { duration: 42, name: 'src/auth/middleware.test.ts', status: 'pass' as const },
  { duration: 18, name: 'src/config/loader.test.ts', status: 'pass' as const },
  {
    detail: 'expected 3 but received 5',
    duration: 1523,
    name: 'src/utils/helpers.test.ts',
    status: 'fail' as const,
  },
  { duration: 7, name: 'src/utils/format.test.ts', status: 'pass' as const },
  { hint: 'deprecated module', name: 'src/legacy/parser.test.ts', status: 'skip' as const },
  { duration: 31, name: 'src/api/client.test.ts', status: 'pass' as const },
  {
    detail: 'timeout after 5000ms',
    duration: 5001,
    name: 'src/api/retry.test.ts',
    status: 'fail' as const,
  },
  { duration: 12, name: 'src/cli/commands.test.ts', status: 'pass' as const },
] as const

export default command({
  description: 'Run tests on the project (simulated)',
  handler: (ctx) => {
    ctx.logger.info('Running tests...')
    ctx.logger.newline()

    RESULTS.reduce((_acc, result) => {
      ctx.logger.check(result)
      return _acc
    }, undefined)

    ctx.logger.tally({
      stats: [
        {
          label: 'Tests',
          value: `${ctx.colors.red('2 failed')} | ${ctx.colors.green('5 passed')} | ${ctx.colors.yellow('1 skipped')} ${ctx.colors.gray('(8)')}`,
        },
        {
          label: 'Suites',
          value: `${ctx.colors.red('1 failed')} | ${ctx.colors.green('5 passed')} ${ctx.colors.gray('(6)')}`,
        },
        { label: 'Duration', value: '5.63s' },
      ],
      style: 'tally',
    })
  },
})
