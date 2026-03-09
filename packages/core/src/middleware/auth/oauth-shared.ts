/**
 * Shared utilities for OAuth-based auth resolvers.
 *
 * Extracted from the local HTTP server, browser-launch, and
 * lifecycle patterns shared by the PKCE and device-code flows.
 *
 * @module
 */

import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { Socket } from 'node:net'
import { platform } from 'node:os'

import { match } from 'ts-pattern'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLOSE_PAGE_HTML = [
  '<!DOCTYPE html>',
  '<html>',
  '<body><p>Authentication complete. You can close this tab.</p></body>',
  '</html>',
].join('\n')

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A deferred promise with an externally accessible resolve function.
 */
export interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

/**
 * A clearable timeout that does not keep the event loop alive after cancellation.
 */
export interface Timeout {
  readonly promise: Promise<void>
  readonly clear: () => void
}

/**
 * Result of starting a local HTTP server with request handling.
 */
export interface LocalServerHandle {
  readonly port: Promise<number | null>
  readonly server: Server
  readonly sockets: Set<Socket>
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Create a deferred promise with externally accessible resolve.
 *
 * Uses a mutable state container to capture the promise resolver --
 * this is an intentional exception to immutability rules because the
 * Promise constructor API requires synchronous resolver capture.
 *
 * @returns A deferred object with promise and resolve.
 */
export function createDeferred<T>(): Deferred<T> {
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
 * Create a clearable timeout.
 *
 * Returns a promise that resolves after `ms` milliseconds and a `clear`
 * function that cancels the timer so it does not hold the event loop open.
 *
 * Uses a mutable state container to capture the timer id -- this is an
 * intentional exception to immutability rules because `setTimeout`
 * returns an opaque handle that must be stored for later cancellation.
 *
 * @param ms - Duration in milliseconds.
 * @returns A Timeout with `promise` and `clear`.
 */
export function createTimeout(ms: number): Timeout {
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
 * Track socket connections on a server so they can be destroyed on close.
 *
 * Mutates the provided socket set -- this is an intentional exception to
 * immutability rules because the HTTP server API is inherently stateful.
 *
 * @param server - The HTTP server.
 * @param sockets - The set to track sockets in.
 */
export function trackConnections(server: Server, sockets: Set<Socket>): void {
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
 * `server.close()` only stops accepting new connections -- existing
 * keep-alive connections hold the event loop open. This helper
 * destroys every tracked socket so the process can exit cleanly.
 *
 * @param server - The HTTP server to close.
 * @param sockets - The set of tracked sockets.
 */
export function destroyServer(server: Server, sockets: Set<Socket>): void {
  server.close()
  Array.from(sockets, (socket) => socket.destroy())
  sockets.clear()
}

/**
 * Send an HTML success page and end the response.
 *
 * @param res - The server response object.
 */
export function sendSuccessPage(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(CLOSE_PAGE_HTML)
}

/**
 * Open a URL in the user's default browser using a platform-specific command.
 *
 * On Windows, `start` is a `cmd.exe` built-in -- not a standalone executable --
 * so it must be invoked via `cmd /c start "" <url>`. The empty string argument
 * prevents `cmd` from interpreting the URL as a window title.
 *
 * @param url - The URL to open.
 */
export function openBrowser(url: string): void {
  const { command, args } = match(platform())
    .with('darwin', () => ({ args: [url], command: 'open' }))
    .with('win32', () => ({ args: ['/c', 'start', '', url], command: 'cmd' }))
    .otherwise(() => ({ args: [url], command: 'xdg-open' }))
  execFile(command, args)
}

/**
 * Start a local HTTP server on `127.0.0.1` with socket tracking.
 *
 * Returns a handle containing the server, tracked sockets, and a port
 * promise that resolves once the server is listening.
 *
 * @param options - Server configuration.
 * @returns A LocalServerHandle with port, server, and sockets.
 */
export function startLocalServer(options: {
  readonly port: number
  readonly onRequest: (req: IncomingMessage, res: ServerResponse) => void
}): LocalServerHandle {
  const portDeferred = createDeferred<number | null>()

  // Mutable socket set required for resource cleanup.
  // Server API is stateful -- tracking sockets is the only way to destroy keep-alive connections.
  const sockets = new Set<Socket>()

  const server = createServer(options.onRequest)

  trackConnections(server, sockets)

  server.on('error', () => {
    destroyServer(server, sockets)
    portDeferred.resolve(null)
  })

  server.listen(options.port, '127.0.0.1', () => {
    const addr = server.address()

    if (addr === null || typeof addr === 'string') {
      destroyServer(server, sockets)
      portDeferred.resolve(null)
      return
    }

    portDeferred.resolve(addr.port)
  })

  return {
    port: portDeferred.promise,
    server,
    sockets,
  }
}
