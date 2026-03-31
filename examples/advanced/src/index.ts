import { cli } from '@kidd-cli/core'
import type { ConfigType, DisplayConfig } from '@kidd-cli/core'
import { http } from '@kidd-cli/core/http'
import type { HttpClient } from '@kidd-cli/core/http'
import { z } from 'zod'

import telemetry from './middleware/telemetry.js'
import timing from './middleware/timing.js'

const configSchema = z.object({
  apiUrl: z.string().url(),
  defaultEnvironment: z.string().default('staging'),
  org: z.string().min(1),
})

declare module '@kidd-cli/core' {
  interface CommandContext {
    readonly api: HttpClient
  }

  interface CliConfig extends ConfigType<typeof configSchema> {}
}

const display: DisplayConfig = {
  guide: false,
  aliases: {
    j: 'down',
    k: 'up',
  },
  messages: {
    cancel: 'Operation cancelled.',
    error: 'Something went wrong!',
  },
  spinner: {
    indicator: 'timer',
    cancelMessage: 'Cancelled',
    errorMessage: 'Failed',
  },
  progress: {
    style: 'heavy',
    size: 30,
  },
  box: {
    rounded: true,
    contentAlign: 'left',
    titleAlign: 'center',
    contentPadding: 1,
    formatBorder: (text: string) => `\x1b[36m${text}\x1b[39m`,
  },
}

cli({
  commands: `${import.meta.dirname}/commands`,
  config: {
    schema: configSchema,
  },
  description: 'Acme platform CLI',
  display,
  help: {
    header: 'acme - the Acme platform CLI',
    order: ['deploy', 'status', 'ping', 'whoami'],
  },
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
