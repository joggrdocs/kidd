import { describe, expect, it } from 'vitest'

import { createBinaryRunner, createNodeRunner } from '../helpers.js'

const runners = [
  { label: 'node', run: createNodeRunner({ example: 'advanced' }) },
  { label: 'binary', run: createBinaryRunner({ example: 'advanced' }) },
] as const

describe('examples/advanced', () => {
  describe.each(runners)('$label', ({ run }) => {
    describe('--help', () => {
      it('should display all top-level commands', () => {
        const help = run('--help')
        expect(help).toContain('acme deploy')
        expect(help).toContain('acme status')
        expect(help).toContain('acme ping')
        expect(help).toContain('acme whoami')
      })

      it('should display command descriptions', () => {
        const help = run('--help')
        expect(help).toContain('Deploy the application')
        expect(help).toContain('Show project status')
        expect(help).toContain('Check API connectivity')
        expect(help).toContain('Display the current user')
      })
    })

    describe('deploy --help', () => {
      it('should display nested subcommands', () => {
        const help = run('deploy', '--help')
        expect(help).toContain('acme deploy production')
        expect(help).toContain('acme deploy preview')
      })

      it('should display subcommand descriptions', () => {
        const help = run('deploy', '--help')
        expect(help).toContain('Deploy to production')
        expect(help).toContain('Deploy a preview environment')
      })
    })
  })
})
