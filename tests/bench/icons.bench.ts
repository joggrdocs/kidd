import { bench, describe } from 'vitest'

import { createExampleRunner } from '../helpers.js'

const run = createExampleRunner({ example: 'icons' })

describe('examples/icons startup', () => {
  bench('--help', () => {
    run('--help')
  })

  bench('status command', () => {
    run('status')
  })
})
