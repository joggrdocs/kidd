import { describe, expect, it } from 'vitest'

import { createBinaryRunner, createNodeRunner } from '../helpers.js'

const runners = [
  { label: 'node', run: createNodeRunner({ example: 'tui' }) },
  { label: 'binary', run: createBinaryRunner({ example: 'tui' }) },
] as const

describe('examples/tui', () => {
  describe.each(runners)('$label', ({ run }) => {
    describe('--help', () => {
      it('should display all commands', () => {
        const help = run('--help')
        expect(help).toContain('tui greet')
        expect(help).toContain('tui crash')
        expect(help).toContain('tui dashboard')
        expect(help).toContain('tui deploy')
        expect(help).toContain('tui scan')
      })
    })

    describe('greet', () => {
      it('should greet by name', () => {
        const output = run('greet', 'Alice')
        expect(output).toContain('Hello, Alice!')
      })

      it('should uppercase when --shout', () => {
        const output = run('greet', 'Bob', '--shout')
        expect(output).toContain('HELLO, BOB!')
      })
    })

    describe('crash', () => {
      it('should exit non-zero for ctx-fail', () => {
        try {
          run('crash', '--mode', 'ctx-fail')
          expect.fail('Expected non-zero exit')
        } catch (error: unknown) {
          const { message } = error as Error
          expect(message).toContain('exited with status 1')
        }
      })

      it('should exit non-zero for throw', () => {
        try {
          run('crash', '--mode', 'throw')
          expect.fail('Expected non-zero exit')
        } catch (error: unknown) {
          const { message } = error as Error
          expect(message).toContain('exited with status 1')
        }
      })
    })
  })
})
