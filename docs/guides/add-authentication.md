# Add Authentication

Add credential resolution, interactive login, and authenticated HTTP requests to a kidd CLI.

## Prerequisites

- An existing kidd CLI project
- `@kidd-cli/core` installed (`pnpm add @kidd-cli/core`)

## Steps

### 1. Register the auth middleware

Import `auth` from `kidd/auth` and add it to the `middleware` array in `cli()`.

```ts
import { cli } from '@kidd-cli/core'
import { auth } from '@kidd-cli/core/auth'

cli({
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      resolvers: [
        {
          source: 'oauth',
          clientId: 'my-client-id',
          authUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
        },
        { source: 'token', message: 'Enter your API token:' },
      ],
    }),
  ],
  commands: `${import.meta.dirname}/commands`,
})
```

The `resolvers` array defines which credential sources to try. Order matters -- resolvers run in sequence and short-circuit on the first success.

### 2. Add a login command

Create a command that calls `ctx.auth.authenticate()` to run the interactive resolvers and persist the credential.

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Authenticate with the service',
  handler: async (ctx) => {
    const [error] = await ctx.auth.authenticate()

    if (error) {
      ctx.fail(error.message)
    }

    ctx.logger.success('Logged in')
  },
})
```

### 3. Guard commands that require auth

Check `ctx.auth.credential()` before making authenticated requests.

```ts
import { command } from '@kidd-cli/core'

export default command({
  description: 'Display the authenticated user',
  handler: async (ctx) => {
    if (!ctx.auth.credential()) {
      ctx.fail('Not authenticated. Run `my-app login` first.')
    }

    ctx.logger.info('Authenticated')
  },
})
```

### 4. Add the HTTP middleware

For authenticated API requests, register the `http()` middleware after `auth()`. It reads `ctx.auth.credential()` automatically and injects the correct HTTP headers.

```ts
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
  name: 'my-app',
  version: '1.0.0',
  middleware: [
    auth({
      resolvers: [
        {
          source: 'oauth',
          clientId: 'my-client-id',
          authUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
        },
        { source: 'token', message: 'Enter your API token:' },
      ],
    }),
    http({
      baseUrl: 'https://api.example.com',
      namespace: 'api',
    }),
  ],
  commands: `${import.meta.dirname}/commands`,
})
```

The `namespace` option determines the context property name. With `namespace: 'api'`, the client is available as `ctx.api`.

### 5. Make authenticated requests

Use the typed HTTP client to make requests. Auth headers are injected automatically.

```ts
import { command } from '@kidd-cli/core'
import { z } from 'zod'

interface Repo {
  readonly id: number
  readonly name: string
  readonly private: boolean
}

const args = z.object({
  json: z.boolean().default(false).describe('Output as JSON'),
})

export default command({
  args,
  description: 'List repositories',
  handler: async (ctx) => {
    ctx.spinner.start('Fetching repos...')

    const res = await ctx.api.get<Repo[]>('/repos')

    ctx.spinner.stop(`Found ${String(res.data.length)} repos`)

    if (ctx.args.json) {
      ctx.output.write(res.data, { json: true })
      return
    }

    const rows = res.data.map((repo) => ({
      Name: repo.name,
      Private: repo.private,
    }))

    ctx.output.table(rows)
  },
})
```

### 6. Support environment variables

Add `env` or `dotenv` resolvers for non-interactive environments (CI, scripts).

```ts
auth({
  resolvers: [
    { source: 'env', tokenVar: 'MY_APP_TOKEN' },
    { source: 'dotenv' },
    {
      source: 'oauth',
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
    },
    { source: 'token' },
  ],
})
```

Passive resolvers (`env`, `dotenv`, `file`) run automatically on middleware init. Interactive resolvers (`oauth`, `device-code`, `token`, `custom`) only run when `ctx.auth.authenticate()` is called.

### 7. Use PKCE with Clerk as the Identity Provider

Configure the OAuth resolver to use Clerk as a public OAuth application with PKCE:

```ts
auth({
  resolvers: [
    {
      source: 'oauth',
      clientId: '<clerk-oauth-app-id>',
      authUrl: 'https://<clerk-domain>/oauth/authorize',
      tokenUrl: 'https://<clerk-domain>/oauth/token',
      scopes: ['openid', 'profile', 'email'],
    },
  ],
})
```

### 8. Use the device code flow for headless environments

For environments without a browser (SSH sessions, remote servers), use the device code flow:

```ts
auth({
  resolvers: [
    {
      source: 'device-code',
      clientId: 'my-client-id',
      deviceAuthUrl: 'https://github.com/login/device/code',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scopes: ['repo', 'read:user'],
    },
  ],
})
```

The CLI displays a URL and a user code. The user opens the URL in any browser (including on a different device), enters the code, and completes authorization.

### 9. Combine multiple resolvers

Chain resolvers to support multiple authentication strategies:

```ts
auth({
  resolvers: [
    { source: 'env', tokenVar: 'MY_APP_TOKEN' },
    { source: 'file' },
    {
      source: 'oauth',
      clientId: 'my-client-id',
      authUrl: 'https://example.com/authorize',
      tokenUrl: 'https://example.com/token',
    },
    {
      source: 'device-code',
      clientId: 'my-client-id',
      deviceAuthUrl: 'https://example.com/device/code',
      tokenUrl: 'https://example.com/token',
    },
    { source: 'token' },
  ],
})
```

## Verification

```bash
# Login interactively
my-app login

# Verify credential was saved
cat ~/.my-app/auth.json

# Use an authenticated command
my-app repos

# Use an environment variable instead
MY_APP_TOKEN=ghp_abc123 my-app repos
```

## Troubleshooting

### OAuth redirect not received

**Issue:** The browser opens but the CLI hangs waiting for the redirect.

**Fix:** Ensure the OAuth provider is configured to redirect to `http://127.0.0.1:<port>/callback` with `code` and `state` query parameters. Verify the `clientId` is correct and the application is configured as a public client with PKCE support. Check that no firewall is blocking the local port.

### Token exchange fails

**Issue:** The redirect is received but no credential is returned.

**Fix:** Verify the `tokenUrl` is correct and accepts `application/x-www-form-urlencoded` POST requests. Ensure the OAuth provider accepts the `code_verifier` parameter for PKCE validation.

### Device code flow times out

**Issue:** The CLI polls but never receives a token.

**Fix:** Verify the `deviceAuthUrl` and `tokenUrl` are correct. Ensure the OAuth provider supports the Device Authorization Grant (RFC 8628). Clerk does not support this flow -- use the `oauth` resolver instead.

### Token not persisted after login

**Issue:** `ctx.auth.credential()` returns null on subsequent runs.

**Fix:** Check that the global store directory (`~/.my-app/`) is writable. Inspect `~/.my-app/auth.json` for valid JSON.

### Wrong environment variable name

**Issue:** The `env` resolver doesn't pick up the token.

**Fix:** The default variable name is derived from the CLI name: `my-app` becomes `MY_APP_TOKEN`. Use `tokenVar` to override if your variable has a different name.

## Resources

- [@clack/prompts](https://www.clack.cc)
- [RFC 7636 -- PKCE](https://tools.ietf.org/html/rfc7636)
- [RFC 8252 -- OAuth for Native Apps](https://tools.ietf.org/html/rfc8252)
- [RFC 8628 -- Device Authorization Grant](https://tools.ietf.org/html/rfc8628)

## References

- [Authentication Concepts](../concepts/authentication.md)
- [kidd API Reference](../reference/kidd.md)
- [Context](../concepts/context.md)
