import { cli } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'
import type { HttpClient } from '@kidd-cli/core/http'
import { logger } from '@kidd-cli/core/logger'

declare module '@kidd-cli/core' {
  interface Context {
    readonly api: HttpClient
  }
}

cli({
  commands: {
    order: ['login', 'logout', 'me', 'repos', 'create-repo'],
    path: `${import.meta.dirname}/commands`,
  },
  description: 'Demo CLI for the faux authenticated service',
  help: { header: 'demo - authenticated service CLI' },
  middleware: [
    logger(),
    auth({
      http: {
        baseUrl: 'http://localhost:3001',
        namespace: 'api',
      },
      resolvers: [
        auth.oauth({
          authUrl: 'http://localhost:3001/authorize',
          clientId: 'demo-client',
          port: 0,
          timeout: 60_000,
          tokenUrl: 'http://localhost:3001/token',
        }),
        auth.token({ message: 'Enter your API token (see README for valid tokens):' }),
      ],
    }),
  ],
  name: 'demo',
  version: '1.0.0',
})
