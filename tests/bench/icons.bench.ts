import { bench, describe } from 'vitest'

import { createInProcessRunner } from '../helpers.js'

const run = createInProcessRunner({ example: 'icons' })

describe('examples/icons startup', () => {
  bench('--help', async () => {
    await run('--help')
  })

  bench('status command', async () => {
    await run('status')
  })
})
