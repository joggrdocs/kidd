import type { ReactElement } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CommandContext, ScreenContext, Store } from '../context/types.js'

vi.mock(import('ink'), () => ({
  render: vi.fn(() => ({
    cleanup: vi.fn(),
    clear: vi.fn(),
    rerender: vi.fn(),
    unmount: vi.fn(),
    waitUntilExit: vi.fn().mockResolvedValue(undefined),
  })),
  renderToString: vi.fn(() => 'rendered-output'),
}))

const ink = await import('ink')
const mockedInkRender = vi.mocked(ink.render)
const mockedInkRenderToString = vi.mocked(ink.renderToString)

function StubComponent(): null {
  return null
}

function makeStore(): Store {
  const map = new Map<string, unknown>()
  return {
    clear: () => map.clear(),
    delete: (key: string) => map.delete(key),
    get: (key: string) => map.get(key),
    has: (key: string) => map.has(key),
    set: (key: string, value: unknown) => map.set(key, value),
  } as Store
}

const baseMeta = Object.freeze({
  command: ['test'] as readonly string[],
  dirs: Object.freeze({ global: '.cli', local: '.cli' }),
  name: 'test-cli',
  version: '1.0.0',
})

function makeContext(overrides?: Partial<CommandContext>): CommandContext {
  return {
    args: {},
    colors: {} as CommandContext['colors'],
    config: {},
    fail: () => {
      throw new Error('fail')
    },
    format: {} as CommandContext['format'],
    log: {} as CommandContext['log'],
    meta: baseMeta,
    prompts: {} as CommandContext['prompts'],
    raw: Object.freeze({ argv: Object.freeze(['test-cli', 'test']) }),
    status: {} as CommandContext['status'],
    store: makeStore(),
    ...overrides,
  } as CommandContext
}

describe('render()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call ink render and return an instance', async () => {
    const { render } = await import('./render.js')
    const instance = await render(<StubComponent />, makeContext())

    expect(mockedInkRender).toHaveBeenCalledOnce()
    expect(instance).toHaveProperty('waitUntilExit')
    expect(instance).toHaveProperty('unmount')
  })

  it('should wrap node in KiddProvider with ScreenContext', async () => {
    const { render } = await import('./render.js')
    const ctx = makeContext({ config: { debug: true } })

    await render(<StubComponent />, ctx)

    const rendered = mockedInkRender.mock.calls[0]![0] as ReactElement
    const providerValue = rendered.props.value as ScreenContext
    expect(providerValue.config).toEqual({ debug: true })
    expect(providerValue).toHaveProperty('log')
    expect(providerValue).not.toHaveProperty('fail')
    expect(providerValue).not.toHaveProperty('prompts')
  })

  it('should pass render options through to ink', async () => {
    const { render } = await import('./render.js')
    const options = { debug: true }

    await render(<StubComponent />, makeContext(), options)

    expect(mockedInkRender).toHaveBeenCalledWith(expect.anything(), options)
  })
})

describe('renderToString()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call ink renderToString and return a string', async () => {
    const { renderToString } = await import('./render.js')
    const result = await renderToString(<StubComponent />, makeContext())

    expect(mockedInkRenderToString).toHaveBeenCalledOnce()
    expect(result).toBe('rendered-output')
  })

  it('should wrap node in KiddProvider with ScreenContext', async () => {
    const { renderToString } = await import('./render.js')
    const ctx = makeContext({ config: { theme: 'dark' } })

    await renderToString(<StubComponent />, ctx)

    const rendered = mockedInkRenderToString.mock.calls[0]![0] as ReactElement
    const providerValue = rendered.props.value as ScreenContext
    expect(providerValue.config).toEqual({ theme: 'dark' })
    expect(providerValue).not.toHaveProperty('colors')
    expect(providerValue).not.toHaveProperty('format')
  })

  it('should pass options through to ink renderToString', async () => {
    const { renderToString } = await import('./render.js')
    const options = { columns: 120 }

    await renderToString(<StubComponent />, makeContext(), options)

    expect(mockedInkRenderToString).toHaveBeenCalledWith(expect.anything(), options)
  })
})
