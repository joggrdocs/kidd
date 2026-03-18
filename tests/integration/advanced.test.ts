import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const EXAMPLE_DIR = fileURLToPath(new URL('../../examples/advanced', import.meta.url))

/**
 * Run the built advanced CLI with the given arguments and return stdout.
 *
 * @private
 * @param args - CLI arguments to pass.
 * @returns The stdout output as a string.
 */
function run(...args: readonly string[]): string {
  return execSync(`node dist/index.mjs ${args.join(' ')} 2>&1`, {
    cwd: EXAMPLE_DIR,
    encoding: 'utf8',
    timeout: 10_000,
  })
}

execSync('pnpm build', { cwd: EXAMPLE_DIR, stdio: 'pipe' })

describe('examples/advanced (built CLI)', () => {
  describe('--help', () => {
    const help = run('--help')

    it('should display all top-level commands', () => {
      expect(help).toContain('acme deploy')
      expect(help).toContain('acme status')
      expect(help).toContain('acme ping')
      expect(help).toContain('acme whoami')
    })

    it('should display command descriptions', () => {
      expect(help).toContain('Deploy the application')
      expect(help).toContain('Show project status')
      expect(help).toContain('Check API connectivity')
      expect(help).toContain('Display the current user')
    })
  })

  describe('deploy --help', () => {
    const help = run('deploy', '--help')

    it('should display nested subcommands', () => {
      expect(help).toContain('acme deploy production')
      expect(help).toContain('acme deploy preview')
    })

    it('should display subcommand descriptions', () => {
      expect(help).toContain('Deploy to production')
      expect(help).toContain('Deploy a preview environment')
    })
  })
})
