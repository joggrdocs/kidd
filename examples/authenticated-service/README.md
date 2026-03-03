# Authenticated Service Example

Demonstrates the kidd `auth` and `http` middleware by building a CLI that makes authenticated requests to a faux API server. Includes a simple browser UI for visual testing.

## Structure

```
authenticated-service/
  api/          # Faux API server (Node.js HTTP, bearer token validation)
  cli/          # kidd CLI with auth + http middleware
  ui/           # Browser dashboard for testing the API
```

## Setup

From the repo root:

```bash
pnpm install
```

## Running

### Quick start

A single command boots the API server and the CLI dev environment together:

```bash
# from examples/authenticated-service/
pnpm start
```

This starts the faux API on port 3001 in the background and launches `kidd dev` for the CLI. When `kidd dev` exits, the API server is cleaned up automatically.

### CLI commands

```bash
# Set token via env var
API_TOKEN=tok_alice_12345 pnpm dev -- me

# Or let the CLI prompt you
pnpm dev -- me

# List repos
API_TOKEN=tok_alice_12345 pnpm dev -- repos --json

# Create a repo
API_TOKEN=tok_alice_12345 pnpm dev -- create-repo --name my-project
```

The CLI tries resolvers in order:

1. `env` — reads `API_TOKEN` from environment
2. `dotenv` — reads from `.env` file
3. `oauth` — opens browser to `http://localhost:3001/auth` for interactive login
4. `prompt` — falls back to interactive terminal prompt

### Run individually

```bash
pnpm api   # API server only (http://localhost:3001)
pnpm dev   # CLI dev mode only (requires API to be running)
```

### API endpoints

| Endpoint  | Method | Auth     | Description                |
| --------- | ------ | -------- | -------------------------- |
| `/health` | GET    | Public   | Health check               |
| `/auth`   | GET    | Public   | Browser auth page          |
| `/user`   | GET    | Required | Current authenticated user |
| `/repos`  | GET    | Required | List user's repos          |
| `/repos`  | POST   | Required | Create a new repo          |

Valid tokens:

- **Alice**: `tok_alice_12345`
- **Bob**: `tok_bob_67890`

### UI

Open `ui/index.html` in a browser. Select a token, connect, and use the buttons to call API endpoints.

## Auth Middleware Configuration

```ts
auth({
  resolvers: [
    { source: 'env', tokenVar: 'API_TOKEN' },
    { source: 'dotenv' },
    { source: 'oauth', authUrl: 'http://localhost:3001/auth', port: 0, timeout: 60_000 },
    { source: 'prompt', message: 'Enter your API token:' },
  ],
})
```

The OAuth resolver starts a local HTTP server and opens the browser. The auth server must POST a JSON body `{ "token": "<value>" }` to the callback URL — query-string tokens are not accepted.

## HTTP Middleware Configuration

```ts
http({
  namespace: 'api',
  baseUrl: 'http://localhost:3001',
})
```

This decorates `ctx.api` with a typed HTTP client. Commands use it as:

```ts
const res = await ctx.api.get<User>('/user')
ctx.logger.info(res.data.login)
```
