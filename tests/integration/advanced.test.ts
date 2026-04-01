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

    describe('status', () => {
      it('should display the CLI name', () => {
        const output = run('status')
        expect(output).toContain('"name": "acme"')
      })

      it('should display the CLI version', () => {
        const output = run('status')
        expect(output).toContain('"version": "2.0.0"')
      })
    })

    describe('whoami', () => {
      it('should display user info', () => {
        const output = run('whoami')
        expect(output).toContain('User: todo')
      })

      it('should output JSON when --json flag is passed', () => {
        const output = run('whoami', '--json')
        expect(output).toContain('"user": "todo"')
      })
    })

    describe('deploy preview', () => {
      it('should display deployment output for a branch', () => {
        const output = run('deploy', 'preview', 'my-branch')
        expect(output).toContain('Preview deployed')
        expect(output).toContain('"branch": "my-branch"')
        expect(output).toContain('"environment": "preview"')
      })

      it('should accept the --clean flag', () => {
        const output = run('deploy', 'preview', 'my-branch', '--clean')
        expect(output).toContain('Preview deployed')
        expect(output).toContain('"branch": "my-branch"')
      })
    })

    describe('deploy production', () => {
      it('should deploy with --force to skip confirmation', () => {
        const output = run('deploy', 'production', '--tag', 'v1.2.3', '--force')
        expect(output).toContain('Deployed v1.2.3 to production')
        expect(output).toContain('"environment": "production"')
        expect(output).toContain('"tag": "v1.2.3"')
      })
    })
  })
})
