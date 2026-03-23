import { describe, expect, it } from 'vitest'

import { createTestContext, mockLog } from './context.js'

describe('test context factory', () => {
  it('should return a context with default args', () => {
    const { ctx } = createTestContext()
    expect(ctx.args).toEqual({})
  })

  it('should return a context with default meta', () => {
    const { ctx } = createTestContext()
    expect(ctx.meta).toMatchObject({ command: ['test'], name: 'test-app', version: '0.0.0' })
  })

  it('should capture log output via stdout', () => {
    const { ctx, stdout } = createTestContext()
    ctx.log.raw('hello world')
    expect(stdout()).toBe('hello world\n')
  })

  it('should accept args overrides', () => {
    const { ctx } = createTestContext({ args: { name: 'Alice' } })
    expect(ctx.args.name).toBe('Alice')
  })

  it('should accept config overrides', () => {
    const { ctx } = createTestContext({ config: { debug: true } })
    expect(ctx.config.debug).toBeTruthy()
  })

  it('should accept meta overrides', () => {
    const { ctx } = createTestContext({
      meta: { command: ['deploy'], name: 'my-cli', version: '2.0.0' },
    })
    expect(ctx.meta).toMatchObject({ command: ['deploy'], name: 'my-cli', version: '2.0.0' })
  })

  it('should accept custom log', () => {
    const log = mockLog({ confirm: [true] })
    const { ctx } = createTestContext({ log })
    expect(ctx.log).toBe(log)
  })

  it('should provide log with stub prompts by default', async () => {
    const { ctx } = createTestContext()
    const spinner = ctx.log.spinner('loading...')
    expect(() => spinner.stop('done')).not.toThrow()
  })
})

describe('mockLog factory', () => {
  it('should return confirm responses in order', async () => {
    const log = mockLog({ confirm: [true, false, true] })
    expect(await log.confirm({ message: '1' })).toBeTruthy()
    expect(await log.confirm({ message: '2' })).toBeFalsy()
    expect(await log.confirm({ message: '3' })).toBeTruthy()
  })

  it('should return text responses in order', async () => {
    const log = mockLog({ text: ['hello', 'world'] })
    expect(await log.text({ message: '1' })).toBe('hello')
    expect(await log.text({ message: '2' })).toBe('world')
  })

  it('should return select responses in order', async () => {
    const log = mockLog({ select: ['a', 'b'] })
    expect(await log.select({ message: '1', options: [] })).toBe('a')
    expect(await log.select({ message: '2', options: [] })).toBe('b')
  })

  it('should return multiselect responses in order', async () => {
    const log = mockLog({ multiselect: [['a', 'b'], ['c']] })
    expect(await log.multiselect({ message: '1', options: [] })).toEqual(['a', 'b'])
    expect(await log.multiselect({ message: '2', options: [] })).toEqual(['c'])
  })

  it('should return password responses in order', async () => {
    const log = mockLog({ password: ['secret'] })
    expect(await log.password({ message: '1' })).toBe('secret')
  })

  it('should throw when confirm queue is exhausted', async () => {
    const log = mockLog({ confirm: [] })
    await expect(log.confirm({ message: 'ok?' })).rejects.toThrow(
      'mockLog: confirm response queue exhausted'
    )
  })

  it('should throw when text queue is exhausted', async () => {
    const log = mockLog({ text: [] })
    await expect(log.text({ message: 'name?' })).rejects.toThrow(
      'mockLog: text response queue exhausted'
    )
  })
})
