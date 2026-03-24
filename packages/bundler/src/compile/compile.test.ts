import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'))
vi.mock(import('node:fs'))

const { execFile } = await import('node:child_process')
const { existsSync, readdirSync } = await import('node:fs')
const { compile } = await import('./compile.js')

const mockExecFile = vi.mocked(execFile)
const mockExistsSync = vi.mocked(existsSync)
const mockReaddirSync = vi.mocked(readdirSync)

beforeEach(() => {
  vi.clearAllMocks()
  mockReaddirSync.mockReturnValue([])
})

describe('compile operation', () => {
  it('should return ok with binaries for all default targets when none specified', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '')
      }
    )

    const [error, output] = await compile({ config: {}, cwd: '/project' })

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

  it('should return err when bundled entry does not exist', async () => {
    mockExistsSync.mockReturnValue(false)

    const [error, output] = await compile({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('run build() first') })
  })

  it('should return err when bun build fails', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(new Error('bun build crashed'), '')
      }
    )

    const [error, output] = await compile({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('bun build --compile failed') })
  })

  it('should include stderr in error message when verbose is true', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
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
      config: { compile: { name: 'my-app', targets: ['linux-x64'] } },
      cwd: '/project',
      verbose: true,
    })

    expect(error).toMatchObject({
      message: expect.stringContaining('could not resolve "chokidar"'),
    })
  })

  it('should not include stderr in error message when verbose is false', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
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
      config: { compile: { name: 'my-app', targets: ['linux-x64'] } },
      cwd: '/project',
    })

    expect(error).toMatchObject({
      message: expect.not.stringContaining('could not resolve'),
    })
  })

  it('should pass correct --target arg for cross-compilation', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '')
      }
    )

    await compile({
      config: { compile: { name: 'my-app', targets: ['linux-x64'] } },
      cwd: '/project',
    })

    expect(mockExecFile).toHaveBeenCalledWith(
      'bun',
      expect.arrayContaining(['--target', 'bun-linux-x64']),
      expect.any(Function)
    )
  })

  it('should map linux-x64-musl to bun-linux-x64', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '')
      }
    )

    await compile({
      config: { compile: { name: 'my-app', targets: ['linux-x64-musl'] } },
      cwd: '/project',
    })

    expect(mockExecFile).toHaveBeenCalledWith(
      'bun',
      expect.arrayContaining(['--target', 'bun-linux-x64']),
      expect.any(Function)
    )
  })

  it('should append target suffix to binary name for multi-target builds', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '')
      }
    )

    const [error, output] = await compile({
      config: { compile: { name: 'my-app', targets: ['darwin-arm64', 'linux-x64'] } },
      cwd: '/project',
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
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '')
      }
    )

    const [error, output] = await compile({ config: {}, cwd: '/project' })

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
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '')
      }
    )

    const [, output] = await compile({
      config: {
        compile: { name: 'my-app', targets: ['darwin-arm64', 'linux-x64', 'windows-x64'] },
      },
      cwd: '/project',
    })

    expect(output).toMatchObject({
      binaries: expect.arrayContaining([
        expect.objectContaining({ label: 'macOS Apple Silicon', target: 'darwin-arm64' }),
        expect.objectContaining({ label: 'Linux x64', target: 'linux-x64' }),
        expect.objectContaining({ label: 'Windows x64', target: 'windows-x64' }),
      ]),
    })
  })

  it('should invoke onTargetStart and onTargetComplete for each target', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '')
      }
    )

    const started: string[] = []
    const completed: string[] = []

    await compile({
      config: { compile: { name: 'my-app', targets: ['darwin-arm64', 'linux-x64'] } },
      cwd: '/project',
      onTargetComplete: (target) => {
        completed.push(target)
      },
      onTargetStart: (target) => {
        started.push(target)
      },
    })

    expect(started).toContain('darwin-arm64')
    expect(started).toContain('linux-x64')
    expect(completed).toContain('darwin-arm64')
    expect(completed).toContain('linux-x64')
  })

  it('should invoke bun with --compile and --outfile args', async () => {
    mockExistsSync.mockReturnValue(true)
    mockExecFile.mockImplementation(
      // @ts-expect-error -- callback signature mismatch with overloaded execFile
      (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
        cb(null, '')
      }
    )

    await compile({ config: { compile: { name: 'my-app' } }, cwd: '/project' })

    expect(mockExecFile).toHaveBeenCalledWith(
      'bun',
      expect.arrayContaining(['build', '--compile', '--outfile']),
      expect.any(Function)
    )
  })
})
