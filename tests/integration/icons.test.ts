import { describe, expect, it } from 'vitest'

import { createExampleRunner } from '../helpers.js'

const run = createExampleRunner({ example: 'icons' })

describe('examples/icons (built CLI)', () => {
  describe('--help', () => {
    const help = run('--help')

    it('should display all commands', () => {
      expect(help).toContain('icon-demo category')
      expect(help).toContain('icon-demo setup')
      expect(help).toContain('icon-demo show')
      expect(help).toContain('icon-demo status')
    })

    it('should display command descriptions', () => {
      expect(help).toContain('List all icons in a category')
      expect(help).toContain('Interactively install Nerd Fonts')
      expect(help).toContain('Show a single icon by name')
      expect(help).toContain('Show Nerd Font detection status and all icons')
    })
  })
})
