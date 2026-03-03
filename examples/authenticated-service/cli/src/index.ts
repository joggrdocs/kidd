import { cli } from 'kidd'
import { auth } from 'kidd/auth'
import { http } from 'kidd/http'

import type { HttpClient } from 'kidd/http'

declare module 'kidd' {
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
          authUrl: 'http://localhost:3001/auth',
          port: 0,
          source: 'oauth',
          timeout: 60_000,
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
