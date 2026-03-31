import { describe, expect, it } from 'vitest'

import { createBinaryRunner, createNodeRunner } from '../helpers.js'

const runners = [
  {
    label: 'node',
    run: createNodeRunner({ example: 'authenticated-service', distPath: 'cli/dist/index.js' }),
  },
  {
    label: 'binary',
    run: createBinaryRunner({ example: 'authenticated-service', distDir: 'cli/dist' }),
  },
] as const

describe('examples/authenticated-service', () => {
  describe.each(runners)('$label', ({ run }) => {
    describe('--help', () => {
      it('should display all commands', () => {
        const help = run('--help')
        expect(help).toContain('demo login')
        expect(help).toContain('demo logout')
        expect(help).toContain('demo me')
        expect(help).toContain('demo repos')
        expect(help).toContain('demo create-repo')
      })

      it('should display command descriptions', () => {
        const help = run('--help')
        expect(help).toContain('Authenticate with the service')
        expect(help).toContain('Log out of the service')
        expect(help).toContain('Display the authenticated user')
        expect(help).toContain('List repositories for the authenticated user')
        expect(help).toContain('Create a new repository')
      })
    })
  })
})
