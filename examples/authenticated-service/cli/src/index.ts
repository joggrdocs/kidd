import { cli } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import { http } from '@kidd-cli/core/http'
import type { HttpClient } from '@kidd-cli/core/http'

declare module '@kidd-cli/core' {
  interface Context {
    readonly api: HttpClient
  }
}

cli({
  commands: `${import.meta.dirname}/commands`,
  description: 'Demo CLI for the faux authenticated service',
  middleware: [
    auth({
      resolvers: [
        {
          authUrl: 'http://localhost:3001/authorize',
          clientId: 'demo-client',
          port: 0,
          source: 'oauth',
          timeout: 60_000,
          tokenUrl: 'http://localhost:3001/token',
        },
        { message: 'Enter your API token (see README for valid tokens):', source: 'prompt' },
      ],
    }),
    http({
      baseUrl: 'http://localhost:3001',
      namespace: 'api',
    }),
  ],
  name: 'demo',
  version: '1.0.0',
})
