import pc from 'picocolors'
import { match } from 'ts-pattern'

import { SYMBOLS } from './constants.js'
import type { CodeFrameInput } from './types.js'

/**
 * Format an annotated code frame (oxlint style).
 *
 * @param input - The code frame data to format.
 * @returns A formatted code frame string.
 */
export function formatCodeFrame(input: CodeFrameInput): string {
  const { annotation, filePath, lines, startLine } = input
  const gutterWidth = String(startLine + lines.length - 1).length

  const header = `  ${pc.cyan(SYMBOLS.arrow)} ${pc.cyan(`${filePath}:${String(annotation.line)}:${String(annotation.column)}`)}`

  const separator = `  ${' '.repeat(gutterWidth)} ${pc.cyan(SYMBOLS.pipe)}`

  const codeLines = lines.map((line, idx) => {
    const lineNum = startLine + idx
    const gutter = pc.cyan(String(lineNum).padStart(gutterWidth))
    return `  ${gutter} ${pc.cyan(SYMBOLS.pipe)} ${line}`
  })

  const annotationLineIdx = annotation.line - startLine
  const pointer = ' '.repeat(annotation.column - 1) + pc.red('^'.repeat(annotation.length))
  const annotationRow = `  ${' '.repeat(gutterWidth)} ${pc.cyan(SYMBOLS.pipe)} ${pointer} ${pc.red(annotation.message)}`

  const outputLines = codeLines.reduce<readonly string[]>((acc, line, idx) => {
    return match(idx === annotationLineIdx)
      .with(true, () => [...acc, line, annotationRow])
      .with(false, () => [...acc, line])
      .exhaustive()
  }, [])

  return [header, separator, ...outputLines, separator].join('\n')
}
