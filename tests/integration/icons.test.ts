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

    describe('status', () => {
      it('should show icon detection info', () => {
        const output = run('status')
        expect(output).toContain('Nerd Fonts')
      })

      it('should show git icon category', () => {
        const output = run('status')
        expect(output).toContain('Git icons:')
      })

      it('should show status icon category', () => {
        const output = run('status')
        expect(output).toContain('Status icons:')
      })

      it('should show devops icon category', () => {
        const output = run('status')
        expect(output).toContain('DevOps icons:')
      })

      it('should show file icon category', () => {
        const output = run('status')
        expect(output).toContain('File icons:')
      })

      it('should list individual icon names', () => {
        const output = run('status')
        expect(output).toContain('branch')
        expect(output).toContain('commit')
        expect(output).toContain('deploy')
        expect(output).toContain('success')
        expect(output).toContain('typescript')
      })
    })

    describe('show', () => {
      it('should show a known git icon by name', () => {
        const output = run('show', 'branch')
        expect(output).toContain('branch')
      })

      it('should show a known status icon by name', () => {
        const output = run('show', 'success')
        expect(output).toContain('success')
      })

      it('should show a known file icon by name', () => {
        const output = run('show', 'typescript')
        expect(output).toContain('typescript')
      })

      it('should show a known devops icon by name', () => {
        const output = run('show', 'docker')
        expect(output).toContain('docker')
      })
    })

    describe('category', () => {
      it('should list git category icons', () => {
        const output = run('category', 'git')
        expect(output).toContain('branch')
        expect(output).toContain('commit')
        expect(output).toContain('merge')
        expect(output).toContain('tag')
      })

      it('should list status category icons', () => {
        const output = run('category', 'status')
        expect(output).toContain('success')
        expect(output).toContain('error')
        expect(output).toContain('warning')
        expect(output).toContain('pending')
      })

      it('should list devops category icons', () => {
        const output = run('category', 'devops')
        expect(output).toContain('deploy')
        expect(output).toContain('docker')
        expect(output).toContain('ci')
        expect(output).toContain('server')
      })

      it('should list files category icons', () => {
        const output = run('category', 'files')
        expect(output).toContain('typescript')
        expect(output).toContain('javascript')
        expect(output).toContain('json')
        expect(output).toContain('markdown')
      })

      it('should display table headers', () => {
        const output = run('category', 'git')
        expect(output).toContain('Glyph')
        expect(output).toContain('Name')
      })
    })
  })
})
