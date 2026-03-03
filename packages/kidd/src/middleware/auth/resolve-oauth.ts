import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { Socket } from 'node:net'
import { platform } from 'node:os'

import { match } from 'ts-pattern'

import type { AuthCredential } from './types.js'

const CLOSE_PAGE_HTML = [
  '<!DOCTYPE html>',
  '<html>',
  '<body><p>Authentication complete. You can close this tab.</p></body>',
  '</html>',
].join('\n')

/**
 * Resolve a bearer credential via an OAuth browser flow.
 *
 * Starts a minimal HTTP server on a local port, opens the user's browser
 * to the auth URL with a callback parameter, and waits for the token
 * to arrive via POST body.
 *
 * Only POST requests with a JSON body containing a `token` field are
 * accepted. Query-string tokens are rejected to avoid leaking credentials
 * in server logs, browser history, and referrer headers.
 *
 * @param options - OAuth flow configuration.
 * @returns A bearer credential on success, null on timeout.
 */
export async function resolveFromOAuth(options: {
  readonly authUrl: string
  readonly port: number
  readonly callbackPath: string
  readonly timeout: number
}): Promise<AuthCredential | null> {
  const controller = new AbortController()

  const timeout = createTimeout(options.timeout)

  const tokenPromise = listenForToken({
    callbackPath: options.callbackPath,
    port: options.port,
    signal: controller.signal,
  })

  const timeoutPromise = timeout.promise.then((): null => {
    controller.abort()
    return null
  })

  const serverPort = await getServerPort(tokenPromise)

  if (serverPort === null) {
    controller.abort()
    timeout.clear()
    return null
  }

  const callbackUrl = `http://localhost:${String(serverPort)}${options.callbackPath}`
  const fullAuthUrl = `${options.authUrl}?callback_url=${encodeURIComponent(callbackUrl)}`
  openBrowser(fullAuthUrl)

  const result = await Promise.race([tokenPromise.result, timeoutPromise])

  timeout.clear()
  controller.abort()

  return result
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Token listener result with port information.
 *
 * @private
 */
interface TokenListener {
  readonly port: Promise<number | null>
  readonly result: Promise<AuthCredential | null>
}

/**
 * Start an HTTP server that listens for an OAuth callback token.
 *
 * The server accepts POST requests with a JSON body `{ "token": "..." }`
 * on the configured callback path. All other requests receive a 400.
 *
 * @private
 * @param options - Listener configuration.
 * @returns A TokenListener with port and result promises.
 */
function listenForToken(options: {
  readonly callbackPath: string
  readonly port: number
  readonly signal: AbortSignal
}): TokenListener {
  const portResolvers = createDeferred<number | null>()
  const resultResolvers = createDeferred<AuthCredential | null>()

  // Mutable socket set required for resource cleanup.
  // Server API is stateful — tracking sockets is the only way to destroy keep-alive connections.
  const sockets = new Set<Socket>()

  const server = createServer((req, res) => {
    extractTokenFromBody(req, options.callbackPath, (token) => {
      if (!token) {
        res.writeHead(400)
        res.end()
        return
      }

      sendSuccessPage(res)
      destroyServer(server, sockets)
      resultResolvers.resolve({ token, type: 'bearer' })
    })
  })

  trackConnections(server, sockets)

  server.on('error', () => {
    destroyServer(server, sockets)
    portResolvers.resolve(null)
    resultResolvers.resolve(null)
  })

  options.signal.addEventListener('abort', () => {
    destroyServer(server, sockets)
    resultResolvers.resolve(null)
  })

  server.listen(options.port, () => {
    const addr = server.address()

    if (addr === null || typeof addr === 'string') {
      destroyServer(server, sockets)
      portResolvers.resolve(null)
      resultResolvers.resolve(null)
      return
    }

    portResolvers.resolve(addr.port)
  })

  return {
    port: portResolvers.promise,
    result: resultResolvers.promise,
  }
}

/**
 * Track socket connections on a server so they can be destroyed on close.
 *
 * Mutates the provided socket set — this is an intentional exception to
 * immutability rules because the HTTP server API is inherently stateful.
 *
 * @private
 * @param server - The HTTP server.
 * @param sockets - The set to track sockets in.
 */
function trackConnections(server: Server, sockets: Set<Socket>): void {
  server.on('connection', (socket: Socket) => {
    sockets.add(socket)
    socket.on('close', () => {
      sockets.delete(socket)
    })
  })
}

/**
 * Close a server and destroy all active connections immediately.
 *
 * `server.close()` only stops accepting new connections — existing
 * keep-alive connections hold the event loop open. This helper
 * destroys every tracked socket so the process can exit cleanly.
 *
 * @private
 * @param server - The HTTP server to close.
 * @param sockets - The set of tracked sockets.
 */
function destroyServer(server: Server, sockets: Set<Socket>): void {
  server.close()
  Array.from(sockets, (socket) => socket.destroy())
  sockets.clear()
}

/**
 * Create a deferred promise with externally accessible resolve.
 *
 * Uses a mutable state container to capture the promise resolver —
 * this is an intentional exception to immutability rules because the
 * Promise constructor API requires synchronous resolver capture.
 *
 * @private
 * @returns A deferred object with promise and resolve.
 */
function createDeferred<T>(): {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
} {
  const state: { resolve: ((value: T) => void) | null } = { resolve: null }

  const promise = new Promise<T>((resolve) => {
    state.resolve = resolve
  })

  return {
    promise,
    resolve: (value: T): void => {
      if (state.resolve) {
        state.resolve(value)
      }
    },
  }
}

/**
 * Clearable timeout that does not keep the event loop alive after cancellation.
 *
 * @private
 */
interface Timeout {
  readonly promise: Promise<void>
  readonly clear: () => void
}

/**
 * Create a clearable timeout.
 *
 * Returns a promise that resolves after `ms` milliseconds and a `clear`
 * function that cancels the timer so it does not hold the event loop open.
 *
 * Uses a mutable state container to capture the timer id — this is an
 * intentional exception to immutability rules because `setTimeout`
 * returns an opaque handle that must be stored for later cancellation.
 *
 * @private
 * @param ms - Duration in milliseconds.
 * @returns A Timeout with `promise` and `clear`.
 */
function createTimeout(ms: number): Timeout {
  const state: { id: ReturnType<typeof setTimeout> | null } = { id: null }

  const promise = new Promise<void>((resolve) => {
    state.id = setTimeout(resolve, ms)
  })

  return {
    clear: (): void => {
      if (state.id !== null) {
        clearTimeout(state.id)
        state.id = null
      }
    },
    promise,
  }
}

/**
 * Get the server port from a token listener.
 *
 * @private
 * @param listener - The token listener.
 * @returns The port number, or null if the server failed to start.
 */
async function getServerPort(listener: TokenListener): Promise<number | null> {
  return listener.port
}

/**
 * Extract a token from the POST body of an incoming HTTP request.
 *
 * Only POST requests to the callback path with a JSON body containing
 * a `token` field are accepted. Query-string tokens are intentionally
 * rejected to prevent credential leakage through browser history,
 * server logs, and referrer headers.
 *
 * @private
 * @param req - The incoming request.
 * @param callbackPath - The expected callback path.
 * @param callback - Called with the extracted token or null.
 */
function extractTokenFromBody(
  req: IncomingMessage,
  callbackPath: string,
  callback: (token: string | null) => void
): void {
  const reqUrl = new URL(req.url ?? '/', 'http://localhost')

  if (reqUrl.pathname !== callbackPath) {
    callback(null)
    return
  }

  if (req.method !== 'POST') {
    callback(null)
    return
  }

  const chunks: Buffer[] = []

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk)
  })

  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8')

    const token = parseTokenFromJson(body)
    callback(token)
  })

  req.on('error', () => {
    callback(null)
  })
}

/**
 * Parse a token string from a JSON body.
 *
 * Expects `{ "token": "<value>" }`. Returns null for invalid JSON
 * or missing/empty token fields.
 *
 * @private
 * @param body - The raw request body string.
 * @returns The token string or null.
 */
function parseTokenFromJson(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body)

    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }

    const record = parsed as Record<string, unknown>

    if (typeof record.token !== 'string' || record.token === '') {
      return null
    }

    return record.token
  } catch {
    return null
  }
}

/**
 * Send an HTML success page and end the response.
 *
 * @private
 * @param res - The server response object.
 */
function sendSuccessPage(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(CLOSE_PAGE_HTML)
}

/**
 * Open a URL in the user's default browser using a platform-specific command.
 *
 * @private
 * @param url - The URL to open.
 */
function openBrowser(url: string): void {
  const command = match(platform())
    .with('darwin', () => 'open')
    .with('win32', () => 'start')
    .otherwise(() => 'xdg-open')
  execFile(command, [url])
}
