# Advanced Example

Demonstrates kidd's advanced features: nested commands, custom middleware, config schema validation, and standalone HTTP middleware with dynamic headers.

## Structure

```
advanced/
  src/
    commands/
      deploy/
        index.ts           # Parent command
        preview.ts         # Deploy preview subcommand
        production.ts      # Deploy production subcommand
      ping.ts              # API connectivity check
      status.ts            # Show project status
      whoami.ts            # Display current user
    middleware/
      telemetry.ts         # Telemetry middleware
      timing.ts            # Execution timing middleware
    index.ts               # CLI entrypoint
```

## Setup

From the repo root:

```bash
pnpm install
```

## Running

```bash
# from examples/advanced/

# Show project status (config values)
pnpm dev -- status

# Check API connectivity
pnpm dev -- ping

# Display current user
pnpm dev -- whoami --json

# Deploy subcommands
pnpm dev -- deploy preview --branch feature
pnpm dev -- deploy production
```

## Config schema

The CLI validates its config with Zod:

```ts
const configSchema = z.object({
  apiUrl: z.string().url(),
  defaultEnvironment: z.string().default('staging'),
  org: z.string().min(1),
})
```

Config values are loaded from a configuration file and accessible via `ctx.config`.

## Middleware stack

| Middleware  | Description                                               |
| ----------- | --------------------------------------------------------- |
| `http()`    | Standalone HTTP client with dynamic config-driven headers |
| `timing`    | Measures and logs command execution time                  |
| `telemetry` | Tracks command invocations                                |

### Standalone `http()` middleware

The `http()` middleware is decoupled from auth and uses a `headers` function to dynamically inject config values:

```ts
import { http } from '@kidd-cli/core/http'

http({
  baseUrl: 'https://api.acme.dev',
  namespace: 'api',
  headers: (ctx) => ({
    'X-Org': ctx.config.org,
    'X-Environment': ctx.config.defaultEnvironment,
  }),
})
```

This creates a typed `ctx.api` HTTP client. Commands use it as:

```ts
const res = await ctx.api.get('/health')
process.stdout.write(ctx.format.json(res.data))
```
