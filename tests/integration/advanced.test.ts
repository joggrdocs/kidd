import { describe, expect, it } from 'vitest'

import { createExampleRunner } from '../helpers.js'

const run = createExampleRunner('advanced')

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
