import { cli } from 'kidd'
import { z } from 'zod'

import telemetry from './middleware/telemetry.js'
import timing from './middleware/timing.js'

const configSchema = z.object({
  apiUrl: z.string().url(),
  defaultEnvironment: z.string().default('staging'),
  org: z.string().min(1),
})

cli({
  config: {
    schema: configSchema,
  },
  description: 'Acme platform CLI',
  middleware: [timing, telemetry],
  name: 'acme',
  version: '2.0.0',
})
