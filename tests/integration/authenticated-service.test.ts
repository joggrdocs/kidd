import { describe, expect, it } from 'vitest'

import { createExampleRunner } from '../helpers.js'

const run = createExampleRunner({ example: 'authenticated-service', distPath: 'cli/dist/index.mjs' })

describe('examples/authenticated-service (built CLI)', () => {
  describe('--help', () => {
    const help = run('--help')

    it('should display all commands', () => {
      expect(help).toContain('demo login')
      expect(help).toContain('demo logout')
      expect(help).toContain('demo me')
      expect(help).toContain('demo repos')
      expect(help).toContain('demo create-repo')
    })

    it('should display command descriptions', () => {
      expect(help).toContain('Authenticate with the service')
      expect(help).toContain('Log out of the service')
      expect(help).toContain('Display the authenticated user')
      expect(help).toContain('List repositories for the authenticated user')
      expect(help).toContain('Create a new repository')
    })
  })
})
