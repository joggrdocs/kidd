import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const EXAMPLES_DIR = fileURLToPath(new URL('../examples', import.meta.url))

/**
 * Create a runner for a built example CLI.
 *
 * @param params - The runner configuration.
 * @param params.example - The example directory name under `examples/`.
 * @param params.distPath - Relative path to the built entry file (default: `dist/index.mjs`).
 * @returns A function that runs the built CLI with the given arguments.
 */
export function createExampleRunner({
  example,
  distPath = 'dist/index.mjs',
}: {
  readonly example: string
  readonly distPath?: string
}): (...args: readonly string[]) => string {
  const cwd = `${EXAMPLES_DIR}/${example}`

  return (...args: readonly string[]): string =>
    execSync(`node ${distPath} ${args.join(' ')} 2>&1`, {
      cwd,
      encoding: 'utf8',
      timeout: 10_000,
    })
}
