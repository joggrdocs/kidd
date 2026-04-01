import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'))
vi.mock(import('node:fs'))

const { execFile } = await import('node:child_process')
const { existsSync, readdirSync } = await import('node:fs')
const { compile } = await import('./compile.js')

const mockExecFile = vi.mocked(execFile)
const mockExistsSync = vi.mocked(existsSync)
const mockReaddirSync = vi.mocked(readdirSync)

const noopLifecycle = {
  onStart: vi.fn(),
  onFinish: vi.fn(),
  onStepStart: vi.fn(),
  onStepFinish: vi.fn(),
}

/**
 * @private
 */
function makeResolved(overrides?: {
  readonly targets?: readonly string[]
  readonly name?: string
}): Parameters<typeof compile>[0]['resolved'] {
  return {
    entry: '/project/src/index.ts',
    commands: '/project/commands',
    buildOutDir: '/project/dist',
    compileOutDir: '/project/dist',
    build: { target: 'node18', minify: false, sourcemap: true, external: [], clean: false },
    compile: {
      targets: (overrides?.targets ?? []) as never,
      name: overrides?.name ?? 'cli',
    },
    include: [],
    cwd: '/project',
  }
}

/**
 * @private
 */
function mockExecFileSuccess() {
  mockExecFile.mockImplementation(
    // @ts-expect-error -- callback signature mismatch with overloaded execFile
    (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
      cb(null, '')
    }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockReaddirSync.mockReturnValue([])
  mockExecFileSuccess()
})

describe('compile operation', () => {
  it('should return ok with binaries for all default targets when none specified', async () => {
    mockExistsSync.mockReturnValue(true)

    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({ target: 'darwin-arm64' }),
        expect.objectContaining({ target: 'darwin-x64' }),
        expect.objectContaining({ target: 'linux-x64' }),
        expect.objectContaining({ target: 'windows-x64' }),
      ]),
    })
  })

  it('should return err when bun is not installed', async () => {
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(new Error('spawn bun ENOENT'), '')
      }
    )

    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      message: expect.stringContaining('bun is not installed'),
    })
  })

  it('should return err when bundled entry does not exist', async () => {
    mockExistsSync.mockReturnValue(false)

    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('run build() first') })
  })

  it('should return err when bun build fails', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile
      .mockImplementationOnce(
        // @ts-expect-error -- callback signature mismatch with overloaded execFile
        (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
          cb(null, '1.0.0')
        }
      )
      .mockImplementation(
        // @ts-expect-error -- callback signature mismatch with overloaded execFile
        (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
          cb(new Error('bun build crashed'), '')
        }
      )

    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('bun build --compile failed') })
  })

  it('should include stderr in error message when verbose is true', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile
      .mockImplementationOnce(
        // @ts-expect-error -- callback signature mismatch with overloaded execFile
        (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
          cb(null, '1.0.0')
        }
      )
      .mockImplementation(
        // @ts-expect-error -- callback signature mismatch with overloaded execFile
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void
        ) => {
          cb(new Error('bun build crashed'), '', 'error: could not resolve "chokidar"')
        }
      )

    const [error] = await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
      verbose: true,
    })

    expect(error).toMatchObject({
      message: expect.stringContaining('could not resolve "chokidar"'),
    })
  })

  it('should not include stderr in error message when verbose is false', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile
      .mockImplementationOnce(
        // @ts-expect-error -- callback signature mismatch with overloaded execFile
        (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
          cb(null, '1.0.0')
        }
      )
      .mockImplementation(
        // @ts-expect-error -- callback signature mismatch with overloaded execFile
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void
        ) => {
          cb(new Error('bun build crashed'), '', 'error: could not resolve "chokidar"')
        }
      )

    const [error] = await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(error).toMatchObject({
      message: expect.not.stringContaining('could not resolve'),
    })
  })

  it('should pass correct --target arg for cross-compilation', async () => {
    mockExistsSync.mockReturnValue(true)

    await compile({
      resolved: makeResolved({ targets: ['linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(mockExecFile).toHaveBeenCalledWith(
      'bun',
      expect.arrayContaining(['--target', 'bun-linux-x64']),
      expect.any(Function)
    )
  })

  it('should map linux-x64-musl to bun-linux-x64', async () => {
    mockExistsSync.mockReturnValue(true)

    await compile({
      resolved: makeResolved({ targets: ['linux-x64-musl'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(mockExecFile).toHaveBeenCalledWith(
      'bun',
      expect.arrayContaining(['--target', 'bun-linux-x64']),
      expect.any(Function)
    )
  })

  it('should append target suffix to binary name for multi-target builds', async () => {
    mockExistsSync.mockReturnValue(true)

    const [error, output] = await compile({
      resolved: makeResolved({ targets: ['darwin-arm64', 'linux-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({
          path: expect.stringContaining('my-app-darwin-arm64'),
          target: 'darwin-arm64',
        }),
        expect.objectContaining({
          path: expect.stringContaining('my-app-linux-x64'),
          target: 'linux-x64',
        }),
      ]),
    })
  })

  it('should append target suffix for default multi-target build', async () => {
    mockExistsSync.mockReturnValue(true)

    const [error, output] = await compile({
      resolved: makeResolved(),
      lifecycle: noopLifecycle,
    })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({ path: expect.stringContaining('cli-darwin-arm64') }),
        expect.objectContaining({ path: expect.stringContaining('cli-linux-x64') }),
      ]),
    })
  })

  it('should include human-readable labels on compiled binaries', async () => {
    mockExistsSync.mockReturnValue(true)

    const [, output] = await compile({
      resolved: makeResolved({ targets: ['darwin-arm64', 'linux-x64', 'windows-x64'], name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({ label: 'macOS Apple Silicon', target: 'darwin-arm64' }),
        expect.objectContaining({ label: 'Linux x64', target: 'linux-x64' }),
        expect.objectContaining({ label: 'Windows x64', target: 'windows-x64' }),
      ]),
    })
  })

  it('should invoke onStepStart and onStepFinish for each target', async () => {
    mockExistsSync.mockReturnValue(true)

    const stepStarts: unknown[] = []
    const stepFinishes: unknown[] = []

    await compile({
      resolved: makeResolved({ targets: ['darwin-arm64', 'linux-x64'], name: 'my-app' }),
      lifecycle: {
        onStepStart: (event) => {
          stepStarts.push(event.meta.target)
        },
        onStepFinish: (event) => {
          stepFinishes.push(event.meta.target)
        },
      },
    })

    expect(stepStarts).toContain('darwin-arm64')
    expect(stepStarts).toContain('linux-x64')
    expect(stepFinishes).toContain('darwin-arm64')
    expect(stepFinishes).toContain('linux-x64')
  })

  it('should invoke bun with --compile and --outfile args', async () => {
    mockExistsSync.mockReturnValue(true)

    await compile({
      resolved: makeResolved({ name: 'my-app' }),
      lifecycle: noopLifecycle,
    })

    expect(mockExecFile).toHaveBeenCalledWith(
      'bun',
      expect.arrayContaining(['build', '--compile', '--outfile']),
      expect.any(Function)
    )
  })
})
