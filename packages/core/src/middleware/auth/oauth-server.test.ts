import { EventEmitter } from 'node:events'
import type { Server, ServerResponse } from 'node:http'
import type { Socket } from 'node:net'

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'), () => ({
  execFile: vi.fn().mockReturnValue({ on: vi.fn() }),
}))

import { execFile } from 'node:child_process'

import {
  createDeferred,
  createTimeout,
  destroyServer,
  openBrowser,
  sendSuccessPage,
  startLocalServer,
  trackConnections,
} from './oauth-server.js'

describe('createDeferred()', () => {
  it('should resolve the promise when resolve is called', async () => {
    const deferred = createDeferred<string>()

    deferred.resolve('hello')

    const result = await deferred.promise
    expect(result).toBe('hello')
  })

  it('should handle resolving with null', async () => {
    const deferred = createDeferred<null>()

    deferred.resolve(null)

    const result = await deferred.promise
    expect(result).toBeNull()
  })
})

describe('createTimeout()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should resolve after the specified duration', async () => {
    vi.useFakeTimers()

    const timeout = createTimeout(100)

    vi.advanceTimersByTime(100)
    await timeout.promise

    vi.useRealTimers()
  })

  it('should cancel the timer when clear is called', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')

    const timeout = createTimeout(1000)
    timeout.clear()

    expect(clearSpy).toHaveBeenCalled()
  })

  it('should be safe to call clear multiple times', () => {
    const timeout = createTimeout(1000)
    timeout.clear()
    timeout.clear()
  })
})

describe('trackConnections()', () => {
  it('should add sockets to the set on connection', () => {
    const server = new EventEmitter() as unknown as Server
    const sockets = new Set<Socket>()

    trackConnections(server, sockets)

    const fakeSocket = { on: vi.fn() } as unknown as Socket
    server.emit('connection', fakeSocket)

    expect(sockets.has(fakeSocket)).toBeTruthy()
  })

  it('should remove sockets from the set on close', () => {
    const server = new EventEmitter() as unknown as Server
    const sockets = new Set<Socket>()

    trackConnections(server, sockets)

    const closeHandlers: (() => void)[] = []
    const fakeSocket = {
      on: vi.fn((_event: string, handler: () => void) => {
        closeHandlers.push(handler)
      }),
    } as unknown as Socket

    server.emit('connection', fakeSocket)
    expect(sockets.has(fakeSocket)).toBeTruthy()

    closeHandlers[0]()
    expect(sockets.has(fakeSocket)).toBeFalsy()
  })
})

describe('destroyServer()', () => {
  it('should close the server and destroy all sockets', () => {
    const server = { close: vi.fn() } as unknown as Server
    const socket1 = { destroy: vi.fn() } as unknown as Socket
    const socket2 = { destroy: vi.fn() } as unknown as Socket
    const sockets = new Set<Socket>([socket1, socket2])

    destroyServer(server, sockets)

    expect(server.close).toHaveBeenCalled()
    expect(socket1.destroy).toHaveBeenCalled()
    expect(socket2.destroy).toHaveBeenCalled()
    expect(sockets.size).toBe(0)
  })
})

describe('sendSuccessPage()', () => {
  it('should send 200 with HTML content', () => {
    const res = {
      end: vi.fn(),
      writeHead: vi.fn(),
    } as unknown as ServerResponse

    sendSuccessPage(res)

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html' })
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Authentication complete'))
  })
})

describe('openBrowser()', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should call execFile with the URL', () => {
    openBrowser('https://example.com')

    expect(vi.mocked(execFile)).toHaveBeenCalled()
    const [, args] = vi.mocked(execFile).mock.calls[0]
    expect(args).toContain('https://example.com')
  })
})

describe('startLocalServer()', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should resolve port when server starts listening', async () => {
    const handle = startLocalServer({
      onRequest: (_req, res) => {
        res.writeHead(200)
        res.end()
      },
      port: 0,
    })

    const port = await handle.port

    expect(port).toBeGreaterThan(0)

    destroyServer(handle.server, handle.sockets)
  })

  it('should return sockets set for tracking', async () => {
    const handle = startLocalServer({
      onRequest: (_req, res) => {
        res.writeHead(200)
        res.end()
      },
      port: 0,
    })

    await handle.port

    expect(handle.sockets).toBeInstanceOf(Set)

    destroyServer(handle.server, handle.sockets)
  })

  it('should resolve port as null when server fails to bind', async () => {
    // Start a server on an ephemeral port first
    const first = startLocalServer({
      onRequest: (_req, res) => {
        res.writeHead(200)
        res.end()
      },
      port: 0,
    })

    const occupiedPort = await first.port

    if (occupiedPort === null) {
      expect.fail('First server should have bound successfully')
    }

    expect(occupiedPort).toBeGreaterThan(0)

    // Try to start another server on the same port
    const second = startLocalServer({
      onRequest: (_req, res) => {
        res.writeHead(200)
        res.end()
      },
      port: occupiedPort,
    })

    const secondPort = await second.port

    expect(secondPort).toBeNull()

    destroyServer(first.server, first.sockets)
  })
})
