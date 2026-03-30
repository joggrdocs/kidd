import { describe, expect, it } from 'vitest'

import { createBinaryRunner, createNodeRunner } from '../helpers.js'

const runners = [
  { label: 'node', run: createNodeRunner({ example: 'icons' }) },
  { label: 'binary', run: createBinaryRunner({ example: 'icons' }) },
] as const

describe('examples/icons', () => {
  describe.each(runners)('$label', ({ run }) => {
    describe('--help', () => {
      it('should display all commands', () => {
        const help = run('--help')
        expect(help).toContain('icon-demo category')
        expect(help).toContain('icon-demo setup')
        expect(help).toContain('icon-demo show')
        expect(help).toContain('icon-demo status')
      })

      it('should display command descriptions', () => {
        const help = run('--help')
        expect(help).toContain('List all icons in a category')
        expect(help).toContain('Interactively install Nerd Fonts')
        expect(help).toContain('Show a single icon by name')
        expect(help).toContain('Show Nerd Font detection status and all icons')
      })
    })
  })
})
