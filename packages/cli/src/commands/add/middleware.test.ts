import type { Context } from '@kidd-cli/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('../../lib/detect.js'), () => ({
  detectProject: vi.fn(),
}))

vi.mock(import('../../lib/render.js'), () => ({
  renderTemplate: vi.fn(),
}))

vi.mock(import('../../lib/write.js'), () => ({
  writeFiles: vi.fn(),
}))

const { detectProject } = await import('../../lib/detect.js')
const { renderTemplate } = await import('../../lib/render.js')
const { writeFiles } = await import('../../lib/write.js')
const mockedDetectProject = vi.mocked(detectProject)
const mockedRenderTemplate = vi.mocked(renderTemplate)
const mockedWriteFiles = vi.mocked(writeFiles)

function makeContext(argOverrides: Record<string, unknown> = {}): Context {
  return {
    args: { description: undefined, name: undefined, ...argOverrides },
    config: {},
    fail: vi.fn((msg: string) => {
      throw new Error(msg)
    }) as never,
    format: { json: vi.fn(() => ''), table: vi.fn(() => '') },
    log: {
      confirm: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      intro: vi.fn(),
      message: vi.fn(),
      multiselect: vi.fn(),
      newline: vi.fn(),
      note: vi.fn(),
      outro: vi.fn(),
      password: vi.fn(),
      raw: vi.fn(),
      select: vi.fn(),
      spinner: vi.fn(() => ({ message: vi.fn(), stop: vi.fn() })),
      step: vi.fn(),
      success: vi.fn(),
      text: vi.fn(),
      warn: vi.fn(),
    },
    meta: { command: ['add', 'middleware'], name: 'kidd', version: '0.0.0' },
    store: { clear: vi.fn(), delete: vi.fn(), get: vi.fn(), has: vi.fn(), set: vi.fn() },
  } as unknown as Context
}

describe('add middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should prompt for missing args', async () => {
    const ctx = makeContext()
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: '/project/src/commands',
        hasKiddDep: true,
        rootDir: '/project',
      },
    ])
    vi.mocked(ctx.log.text)
      .mockResolvedValueOnce('auth')
      .mockResolvedValueOnce('Authentication middleware')
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['auth.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(ctx.log.text).toHaveBeenCalledTimes(2)
  })

  it('should render middleware template with correct variables', async () => {
    const ctx = makeContext({ description: 'Request logging', name: 'logging' })
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: '/project/src/commands',
        hasKiddDep: true,
        rootDir: '/project',
      },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['logging.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(mockedRenderTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { description: 'Request logging', middlewareName: 'logging' },
      })
    )
  })

  it('should rename output file to match middleware name', async () => {
    const ctx = makeContext({ description: 'Auth', name: 'auth' })
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: null,
        hasKiddDep: true,
        rootDir: '/project',
      },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['auth.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    const { files } = mockedWriteFiles.mock.calls[0]![0]!
    expect(files[0]!.relativePath).toBe('auth.ts')
  })

  it('should write to src/middleware directory', async () => {
    const ctx = makeContext({ description: 'Auth', name: 'auth' })
    mockedDetectProject.mockResolvedValue([
      null,
      {
        commandsDir: null,
        hasKiddDep: true,
        rootDir: '/project',
      },
    ])
    mockedRenderTemplate.mockResolvedValue([
      null,
      [{ content: 'code', relativePath: 'middleware.ts' }],
    ])
    mockedWriteFiles.mockResolvedValue([null, { skipped: [], written: ['auth.ts'] }])

    const mod = await import('./middleware.js')
    await mod.default.handler!(ctx)

    expect(mockedWriteFiles).toHaveBeenCalledWith(
      expect.objectContaining({ outputDir: '/project/src/middleware' })
    )
  })

  it('should fail when not in a kidd project', async () => {
    const ctx = makeContext({ name: 'auth' })
    mockedDetectProject.mockResolvedValue([null, null])

    const mod = await import('./middleware.js')
    await expect(mod.default.handler!(ctx)).rejects.toThrow('Not in a kidd project')
  })
})
