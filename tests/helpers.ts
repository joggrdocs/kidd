import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const EXAMPLES_DIR = fileURLToPath(new URL('../examples', import.meta.url))

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
 * env vars, real stdout).
 */
type SubprocessRunner = (...args: readonly string[]) => string

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
