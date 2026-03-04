/**
 * Faux authenticated API server.
 *
 * A minimal HTTP server that validates bearer tokens and serves
 * user and repository data. Used to demonstrate the kidd auth
 * and http middleware in action.
 *
 * Start with: `pnpm api` or `npx tsx api/server.ts`
 */
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ---------------------------------------------------------------------------
// In-memory data
// ---------------------------------------------------------------------------

const VALID_TOKENS: ReadonlyMap<string, string> = new Map([
  ['tok_alice_12345', 'alice'],
  ['tok_bob_67890', 'bob'],
])

interface User {
  readonly login: string
  readonly id: number
  readonly name: string
  readonly email: string
}

interface Repo {
  readonly id: number
  readonly name: string
  readonly full_name: string
  readonly private: boolean
  readonly owner: string
}

const USERS: ReadonlyMap<string, User> = new Map([
  ['alice', { login: 'alice', id: 1, name: 'Alice Smith', email: 'alice@example.com' }],
  ['bob', { login: 'bob', id: 2, name: 'Bob Jones', email: 'bob@example.com' }],
])

const REPOS: Repo[] = [
  { id: 1, name: 'acme-cli', full_name: 'alice/acme-cli', private: false, owner: 'alice' },
  {
    id: 2,
    name: 'secret-project',
    full_name: 'alice/secret-project',
    private: true,
    owner: 'alice',
  },
  { id: 3, name: 'bob-tools', full_name: 'bob/bob-tools', private: false, owner: 'bob' },
]

// ---------------------------------------------------------------------------
// Auth + routing
// ---------------------------------------------------------------------------

function extractBearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  if (header === undefined) return null
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7)
}

function authenticateRequest(req: IncomingMessage): string | null {
  const token = extractBearer(req)
  if (token === null) return null
  return VALID_TOKENS.get(token) ?? null
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
  })
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function handleGetUser(login: string, res: ServerResponse): void {
  const user = USERS.get(login)
  if (user === undefined) {
    sendJson(res, 404, { error: 'User not found' })
    return
  }
  sendJson(res, 200, user)
}

function handleListRepos(login: string, res: ServerResponse): void {
  const userRepos = REPOS.filter((r) => r.owner === login)
  sendJson(res, 200, userRepos)
}

async function handleCreateRepo(
  login: string,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const raw = await readBody(req)
  try {
    const body = JSON.parse(raw) as { name?: string; private?: boolean }
    const name = body.name ?? 'untitled'
    const isPrivate = body.private ?? false
    const repo: Repo = {
      id: REPOS.length + 1,
      name,
      full_name: `${login}/${name}`,
      private: isPrivate,
      owner: login,
    }
    REPOS.push(repo)
    sendJson(res, 201, repo)
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' })
  }
}

function handleHealth(res: ServerResponse): void {
  sendJson(res, 200, { status: 'ok', uptime: process.uptime() })
}

// ---------------------------------------------------------------------------
// Auth callback (for OAuth flow demo)
// ---------------------------------------------------------------------------

function handleAuthPage(res: ServerResponse, callbackUrl: string | null): void {
  const postScript =
    callbackUrl !== null
      ? [
          `      fetch('${callbackUrl}', {`,
          "        method: 'POST',",
          "        headers: { 'Content-Type': 'application/json' },",
          '        body: JSON.stringify({ token }),',
          '      }).then(function() {',
          "        document.body.innerHTML = '<h1>Authenticated</h1><p>You can close this tab.</p>';",
          '      });',
        ].join('\n')
      : '      document.body.innerHTML = "<h1>Token: " + token + "</h1><p>Copy this token to use with the CLI.</p>";'

  const html = [
    '<!DOCTYPE html>',
    '<html>',
    '<head><title>Login</title><style>',
    '  body { font-family: system-ui; max-width: 400px; margin: 80px auto; }',
    '  button { padding: 10px 24px; font-size: 16px; cursor: pointer; }',
    '  .token-list { margin: 20px 0; }',
    '  .token-list button { display: block; margin: 8px 0; width: 100%; }',
    '</style></head>',
    '<body>',
    '  <h1>Faux Auth Server</h1>',
    '  <p>Select a user to authenticate as:</p>',
    '  <div class="token-list">',
    `    <button onclick="authenticate('tok_alice_12345')">Login as Alice</button>`,
    `    <button onclick="authenticate('tok_bob_67890')">Login as Bob</button>`,
    '  </div>',
    '  <script>',
    '    function authenticate(token) {',
    postScript,
    '    }',
    '  </script>',
    '</body>',
    '</html>',
  ].join('\n')

  res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' })
  res.end(html)
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? '3001', 10)

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${String(PORT)}`)
  const { pathname } = url
  const method = req.method ?? 'GET'

  // CORS preflight
  if (method === 'OPTIONS') {
    sendJson(res, 204, null)
    return
  }

  // Public routes
  if (pathname === '/health') {
    handleHealth(res)
    return
  }

  if (pathname === '/auth') {
    const callbackUrl = url.searchParams.get('callback_url')
    handleAuthPage(res, callbackUrl)
    return
  }

  // Protected routes — require bearer token
  const login = authenticateRequest(req)
  if (login === null) {
    sendJson(res, 401, { error: 'Unauthorized — provide a valid Bearer token' })
    return
  }

  if (pathname === '/user' && method === 'GET') {
    handleGetUser(login, res)
    return
  }

  if (pathname === '/repos' && method === 'GET') {
    handleListRepos(login, res)
    return
  }

  if (pathname === '/repos' && method === 'POST') {
    await handleCreateRepo(login, req, res)
    return
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Faux API server running at http://localhost:${String(PORT)}`)
  console.log('')
  console.log('Public endpoints:')
  console.log(`  GET  http://localhost:${String(PORT)}/health`)
  console.log(`  GET  http://localhost:${String(PORT)}/auth`)
  console.log('')
  console.log('Protected endpoints (require Bearer token):')
  console.log(`  GET  http://localhost:${String(PORT)}/user`)
  console.log(`  GET  http://localhost:${String(PORT)}/repos`)
  console.log(`  POST http://localhost:${String(PORT)}/repos`)
  console.log('')
  console.log('Valid tokens:')
  console.log('  Alice: tok_alice_12345')
  console.log('  Bob:   tok_bob_67890')
})
