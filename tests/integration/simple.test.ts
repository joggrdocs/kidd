import { describe, expect, it } from 'vitest'

import { createExampleRunner } from '../helpers.js'

const run = createExampleRunner({ example: 'simple' })

describe('examples/simple (built CLI)', () => {
  describe('--help', () => {
    const help = run('--help')

    it('should display all commands', () => {
      expect(help).toContain('tasks greet')
      expect(help).toContain('tasks init')
      expect(help).toContain('tasks list')
    })

    it('should display command descriptions', () => {
      expect(help).toContain('Greet someone by name')
      expect(help).toContain('Initialize a new project interactively')
      expect(help).toContain('List all tasks')
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

  describe('list', () => {
    it('should display all tasks by default', () => {
      const output = run('list')
      expect(output).toContain('Set up CI pipeline')
      expect(output).toContain('Write integration tests')
      expect(output).toContain('Deploy to staging')
      expect(output).toContain('Update README')
      expect(output).toContain('Review security audit')
    })

    it('should filter to active tasks', () => {
      const output = run('list', '--status', 'active')
      expect(output).toContain('Write integration tests')
      expect(output).toContain('Deploy to staging')
      expect(output).toContain('Review security audit')
      expect(output).not.toContain('Set up CI pipeline')
      expect(output).not.toContain('Update README')
    })

    it('should filter to done tasks', () => {
      const output = run('list', '--status', 'done')
      expect(output).toContain('Set up CI pipeline')
      expect(output).toContain('Update README')
      expect(output).not.toContain('Write integration tests')
      expect(output).not.toContain('Deploy to staging')
      expect(output).not.toContain('Review security audit')
    })

    it('should output valid JSON with --json', () => {
      const output = run('list', '--json')
      const parsed = JSON.parse(output) as unknown[]
      expect(parsed).toHaveLength(5)
    })

    it('should output filtered JSON with --json --status active', () => {
      const output = run('list', '--json', '--status', 'active')
      const parsed = JSON.parse(output) as unknown[]
      expect(parsed).toHaveLength(3)
    })
  })
})
