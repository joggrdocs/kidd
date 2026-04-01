import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('node:child_process'))
vi.mock(import('node:fs/promises'))
vi.mock(import('../config/read-version.js'))
vi.mock(import('../config/resolve-config.js'))
vi.mock(import('./bun-config.js'))
vi.mock(import('./clean.js'))

const { execFile } = await import('node:child_process')
const { readFile, writeFile, unlink } = await import('node:fs/promises')
const { readVersion } = await import('../config/read-version.js')
const { resolveConfig } = await import('../config/resolve-config.js')
const { buildRunnerConfig } = await import('./bun-config.js')
const { build } = await import('./build.js')

const mockExecFile = vi.mocked(execFile)
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockUnlink = vi.mocked(unlink)
const mockReadVersion = vi.mocked(readVersion)
const mockResolveConfig = vi.mocked(resolveConfig)
const mockBuildRunnerConfig = vi.mocked(buildRunnerConfig)

const SUCCESS_STDOUT = JSON.stringify({
  success: true,
  entryFile: '/project/dist/index.js',
  errors: [],
})

const RESOLVED_CONFIG = {
  entry: '/project/src/index.ts',
  commands: '/project/commands',
  buildOutDir: '/project/dist',
  compileOutDir: '/project/dist',
  build: {
    target: 'node18',
    minify: false,
    sourcemap: true,
    external: [],
    clean: false,
  },
  compile: {
    targets: [],
    name: 'cli',
  },
  include: [],
  cwd: '/project',
} as const

function mockExecFileSuccess(stdout: string = SUCCESS_STDOUT) {
  mockExecFile.mockImplementation(
    // @ts-expect-error -- callback signature mismatch with overloaded execFile
    (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
      cb(null, stdout, '')
    },
  )
}

function mockExecFileFailure(error: Error) {
  mockExecFile.mockImplementation(
    // @ts-expect-error -- callback signature mismatch with overloaded execFile
    (_cmd: string, _args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
      cb(error, '', '')
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockReadVersion.mockResolvedValue([null, '1.0.0'])
  mockResolveConfig.mockReturnValue(RESOLVED_CONFIG)
  mockBuildRunnerConfig.mockReturnValue({
    entry: '/project/src/index.ts',
    outDir: '/project/dist',
    commandsDir: '/project/commands',
    tagModulePath: '/fake/tag.js',
    coreDistDir: '/fake/core',
    minify: false,
    sourcemap: true,
    target: 'node18',
    define: {},
    external: [],
    compile: false,
    stubPackages: [],
    alwaysBundlePatterns: [],
    nodeBuiltins: [],
  })
  // @ts-expect-error -- writeFile overload signature mismatch
  mockWriteFile.mockResolvedValue(undefined)
  mockUnlink.mockResolvedValue(undefined)
})

describe('build operation', () => {
  it('should return ok with build output on success', async () => {
    mockExecFileSuccess()
    // @ts-expect-error -- readFile overload signature mismatch
    mockReadFile.mockResolvedValueOnce('console.log("hello")')

    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(error).toBeNull()
    expect(output).toMatchObject({
      entryFile: '/project/dist/index.js',
      outDir: '/project/dist',
      version: '1.0.0',
    })
  })

  it('should return err with Error on bun build failure', async () => {
    mockExecFileFailure(new Error('bun crashed'))

    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      message: expect.stringContaining('failed to parse bun build result'),
      cause: expect.objectContaining({ message: 'bun crashed' }),
    })
  })

  it('should return err when no entry file is produced', async () => {
    const stdout = JSON.stringify({
      success: true,
      entryFile: undefined,
      errors: [],
    })
    mockExecFileSuccess(stdout)

    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(output).toBeNull()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ message: expect.stringContaining('no entry file') })
  })

  it('should include version in build output', async () => {
    mockReadVersion.mockResolvedValueOnce([null, '2.5.0'])
    mockExecFileSuccess()
    // @ts-expect-error -- readFile overload signature mismatch
    mockReadFile.mockResolvedValueOnce('console.log("hello")')

    const [, output] = await build({ config: {}, cwd: '/project' })

    expect(output).toMatchObject({ version: '2.5.0' })
  })

  it('should continue with undefined version when readVersion fails', async () => {
    mockReadVersion.mockResolvedValueOnce([new Error('ENOENT'), null])
    mockExecFileSuccess()
    // @ts-expect-error -- readFile overload signature mismatch
    mockReadFile.mockResolvedValueOnce('console.log("hello")')

    const [error, output] = await build({ config: {}, cwd: '/project' })

    expect(error).toBeNull()
    expect(output).toHaveProperty('version', undefined)
  })

  it('should prepend shebang to entry file on success', async () => {
    const originalContent = 'console.log("hello")'
    mockExecFileSuccess()
    // @ts-expect-error -- readFile overload signature mismatch
    mockReadFile.mockResolvedValueOnce(originalContent)

    await build({ config: {}, cwd: '/project' })

    expect(mockWriteFile).toHaveBeenCalledWith(
      '/project/dist/index.js',
      `#!/usr/bin/env node\n${originalContent}`,
      'utf-8',
    )
  })
})
