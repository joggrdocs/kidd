/* eslint-disable */
// Demo script: npx tsx scripts/demo-format.ts

import pc from 'picocolors'

import {
  formatCodeFrame,
  formatCheck,
  formatDuration,
  formatFinding,
  formatTally,
} from '../packages/core/src/lib/format/index.js'

console.log('\n=== formatDuration ===\n')
console.log('  0.3ms  →', formatDuration(0.3))
console.log('  150ms  →', formatDuration(150))
console.log('  1234ms →', formatDuration(1234))
console.log('  125000 →', formatDuration(125000))

console.log('\n=== formatCheck ===\n')
console.log(formatCheck({ status: 'pass', name: 'src/utils.test.ts', duration: 42 }))
console.log(
  formatCheck({
    status: 'fail',
    name: 'src/auth.test.ts',
    detail: '2 assertions failed',
    duration: 1523,
  })
)
console.log(formatCheck({ status: 'warn', name: 'src/config.ts', hint: 'deprecated API' }))
console.log(formatCheck({ status: 'skip', name: 'src/old.test.ts', hint: 'todo' }))
console.log(formatCheck({ status: 'fix', name: 'src/lint.ts', detail: 'auto-fixed 3 issues' }))

console.log('\n=== formatTally (tally) ===\n')
console.log(
  formatTally({
    stats: [
      {
        label: 'Tests',
        value: `${pc.red('2 failed')} | ${pc.green('42 passed')} | ${pc.yellow('1 skipped')} ${pc.gray('(45)')}`,
      },
      {
        label: 'Suites',
        value: `${pc.red('1 failed')} | ${pc.green('8 passed')} ${pc.gray('(9)')}`,
      },
      { label: 'Duration', value: '1.79s' },
    ],
    style: 'tally',
  })
)

console.log('\n=== formatCodeFrame ===\n')
console.log(
  formatCodeFrame({
    filePath: 'src/auth/middleware.ts',
    lines: [
      '  const token = getToken(req)',
      '  const user = await verifyToken(token)',
      '  req.user = user',
    ],
    startLine: 14,
    annotation: {
      line: 16,
      column: 3,
      length: 8,
      message: 'mutation of parameter',
    },
  })
)

console.log('\n=== formatFinding ===\n')
console.log(
  formatFinding({
    severity: 'error',
    rule: 'no-param-reassign',
    category: 'correctness',
    message: "Assignment to function parameter 'req'",
    frame: {
      filePath: 'src/auth/middleware.ts',
      lines: [
        '  const token = getToken(req)',
        '  const user = await verifyToken(token)',
        '  req.user = user',
      ],
      startLine: 14,
      annotation: {
        line: 16,
        column: 3,
        length: 8,
        message: 'mutation of parameter',
      },
    },
    help: 'Consider using a new variable instead of reassigning the parameter.',
  })
)

console.log()
console.log(
  formatFinding({
    severity: 'warning',
    rule: 'no-unused-vars',
    message: "'oldConfig' is defined but never used",
  })
)

console.log('\n=== formatTally (inline) ===\n')
console.log(
  formatTally({
    stats: [
      pc.red('1 error'),
      pc.yellow('3 warnings'),
      pc.dim('95 files'),
      pc.dim('200 rules'),
      pc.dim('in 142ms'),
    ],
    style: 'inline',
  })
)

console.log(
  formatTally({
    stats: [pc.green('7 fixed'), pc.dim('12 files'), pc.dim('in 47ms')],
    style: 'inline',
  })
)

console.log()
