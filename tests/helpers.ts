import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const EXAMPLES_DIR = fileURLToPath(new URL('../examples', import.meta.url))

/**
 * Output captured from a CLI invocation.
 */
interface CliRunResult {
  readonly stdout: string
  readonly stderr: string
  readonly output: string
  readonly exitCode: number | undefined
}

/**
 * Options for creating a CLI runner.
 */
interface CliRunnerOptions {
  /**
   * The example directory name under `examples/`.
   */
  readonly example: string
  /**
   * Relative path to the built entry file (default: `dist/index.mjs`).
   */
  readonly distPath?: string
}

/**
 * A subprocess runner that spawns the built CLI as a child process.
 *
 * Best for integration tests that need full process isolation (exit codes,
 * env vars, real stdout). CodSpeed cannot profile the child process.
 */
type SubprocessRunner = (...args: readonly string[]) => string

/**
 * An in-process runner that dynamically imports the built CLI entry.
 *
 * Best for benchmarks where CodSpeed needs V8 frame visibility for
 * flamegraph generation. Stubs process.argv and process.exit for the
 * duration of each call.
 */
type InProcessRunner = (...args: readonly string[]) => Promise<CliRunResult>

/**
 * Create a subprocess runner for a built example CLI.
 *
 * Spawns `node <distPath>` with the given arguments. Returns combined
 * stdout + stderr as a string, or throws on non-zero exit.
 *
 * @param options - Runner configuration.
 * @returns A function that runs the built CLI with the given arguments.
 */
export function createExampleRunner({
  example,
  distPath = 'dist/index.mjs',
}: CliRunnerOptions): SubprocessRunner {
  const cwd = `${EXAMPLES_DIR}/${example}`

  return (...args: readonly string[]): string => {
    const result = spawnSync('node', [distPath, ...args], {
      cwd,
      encoding: 'utf8',
      timeout: 10_000,
    })

    if (result.error) {
      throw result.error
    }

    if (result.status !== 0) {
      throw new Error(`CLI exited with status ${String(result.status)}: ${result.stderr}`)
    }

    return `${result.stdout}${result.stderr}`
  }
}

/**
 * Create an in-process runner for a built example CLI.
 *
 * Dynamically imports the built entry file with process.argv stubbed
 * to the given arguments. Intercepts process.exit so it does not kill
 * the host process. Captures stdout and stderr via writable stream stubs.
 *
 * Each call uses a unique query parameter on the import specifier to
 * bypass Node's module cache, ensuring a fresh evaluation every time.
 *
 * @param options - Runner configuration.
 * @returns An async function that runs the built CLI in-process.
 */
export function createInProcessRunner({
  example,
  distPath = 'dist/index.mjs',
}: CliRunnerOptions): InProcessRunner {
  const entryUrl = pathToFileURL(`${EXAMPLES_DIR}/${example}/${distPath}`)
  const queue: { tail: Promise<void> } = { tail: Promise.resolve() }

  const runOnce = async (...args: readonly string[]): Promise<CliRunResult> => {
    const originalArgv = process.argv
    const originalExit = process.exit
    const originalStdoutWrite = process.stdout.write
    const originalStderrWrite = process.stderr.write

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []
    const exitCapture: { code: number | undefined } = { code: undefined }

    process.argv = ['node', 'cli', ...args]

    process.exit = ((code?: number) => {
      exitCapture.code = code ?? 0
    }) as typeof process.exit

    process.stdout.write = ((chunk: string | Uint8Array) => {
      if (typeof chunk === 'string') {
        stdoutChunks.push(chunk)
      } else {
        stdoutChunks.push(new TextDecoder().decode(chunk))
      }
      return true
    }) as typeof process.stdout.write

    process.stderr.write = ((chunk: string | Uint8Array) => {
      if (typeof chunk === 'string') {
        stderrChunks.push(chunk)
      } else {
        stderrChunks.push(new TextDecoder().decode(chunk))
      }
      return true
    }) as typeof process.stderr.write

    try {
      const specifier = new URL(entryUrl.href)
      specifier.searchParams.set('t', String(Date.now()))
      await import(specifier.href)
    } finally {
      process.argv = originalArgv
      process.exit = originalExit
      process.stdout.write = originalStdoutWrite
      process.stderr.write = originalStderrWrite
    }

    const stdout = stdoutChunks.join('')
    const stderr = stderrChunks.join('')

    return {
      exitCode: exitCapture.code,
      output: `${stdout}${stderr}`,
      stderr,
      stdout,
    }
  }

  return (...args: readonly string[]): Promise<CliRunResult> => {
    const next = queue.tail.then(() => runOnce(...args), () => runOnce(...args))
    queue.tail = next.then(() => undefined, () => undefined)
    return next
  }
}
