import { cli } from '@kidd-cli/core'
import { http } from '@kidd-cli/core/http'
import type { HttpClient } from '@kidd-cli/core/http'
import { z } from 'zod'

import telemetry from './middleware/telemetry.js'
import timing from './middleware/timing.js'

declare module '@kidd-cli/core' {
  interface Context {
    readonly api: HttpClient
  }
}

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
  help: { header: 'acme - the Acme platform CLI' },
  middleware: [
    http({
      baseUrl: 'https://api.acme.dev',
      headers: (ctx) => ({
        'X-Environment': String(ctx.config.defaultEnvironment),
        'X-Org': String(ctx.config.org),
      }),
      namespace: 'api',
    }),
    timing,
    telemetry,
  ],
  name: 'acme',
  version: '2.0.0',
})
