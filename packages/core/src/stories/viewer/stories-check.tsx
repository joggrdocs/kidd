import process from 'node:process'

import { Box, Text, useApp } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'

import type { CheckResult, StoryDiagnostic } from '../check.js'
import { checkStories } from '../check.js'
import { discoverStories } from '../discover.js'
import { createStoryImporter } from '../importer.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link StoriesCheck} component.
 */
interface StoriesCheckProps {
  readonly include?: string
}

/**
 * Check phase state.
 *
 * @private
 */
type CheckState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'error'; readonly message: string }
  | { readonly phase: 'done'; readonly result: CheckResult }

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Non-interactive component that discovers stories, validates them,
 * and prints diagnostics to stdout before exiting.
 *
 * @param props - The check props.
 * @returns A rendered check element.
 */
export function StoriesCheck({ include }: StoriesCheckProps): ReactElement {
  const [state, setState] = useState<CheckState>({ phase: 'loading' })
  const { exit } = useApp()

  useEffect(() => {
    const importer = createStoryImporter()
    const cwd = process.cwd()
    const includePatterns = buildIncludePatterns(include)

    const run = async (): Promise<void> => {
      const result = await discoverStories({
        cwd,
        importer,
        include: includePatterns,
      })

      if (result.entries.size === 0) {
        setState({ phase: 'error', message: 'No stories found.' })
        return
      }

      const checkResult = checkStories(result.entries)
      setState({ phase: 'done', result: checkResult })
    }

    run().catch((error: unknown) => {
      const message = match(error instanceof Error)
        .with(true, () => (error as Error).message)
        .with(false, () => 'Unknown error during discovery')
        .exhaustive()
      setState({ phase: 'error', message })
    })
  }, [include])

  const shouldExit = state.phase === 'done' || state.phase === 'error'
  useEffect(() => {
    if (shouldExit) {
      exit()
    }
  }, [shouldExit, exit])

  return match(state)
    .with({ phase: 'loading' }, () => <Text dimColor>Checking stories...</Text>)
    .with({ phase: 'error' }, ({ message }) => <Text color="red">{message}</Text>)
    .with({ phase: 'done' }, ({ result }) => <CheckReport result={result} />)
    .exhaustive()
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the full check report with diagnostics and summary.
 *
 * @private
 */
function CheckReport({ result }: { readonly result: CheckResult }): ReactElement {
  const errors = result.diagnostics.filter((d) => d.severity === 'error')
  const warnings = result.diagnostics.filter((d) => d.severity === 'warning')

  return (
    <Box flexDirection="column">
      {errors.map((d) => (
        <DiagnosticRow key={`err-${d.storyName}-${d.message}`} diagnostic={d} />
      ))}
      {warnings.map((d) => (
        <DiagnosticRow key={`warn-${d.storyName}-${d.message}`} diagnostic={d} />
      ))}
      <Box marginTop={1}>
        {match(result.passed)
          .with(true, () => (
            <Text color="green" bold>
              ✔ {String(result.storyCount)} stories checked — no issues found
            </Text>
          ))
          .with(false, () => (
            <Text color="red" bold>
              ✖ {String(result.storyCount)} stories checked — {String(errors.length)} error
              {match(errors.length !== 1)
                .with(true, () => 's')
                .with(false, () => '')
                .exhaustive()}
              {match(warnings.length > 0)
                .with(
                  true,
                  () =>
                    `, ${String(warnings.length)} warning${match(warnings.length !== 1)
                      .with(true, () => 's')
                      .with(false, () => '')
                      .exhaustive()}`
                )
                .with(false, () => '')
                .exhaustive()}
            </Text>
          ))
          .exhaustive()}
      </Box>
    </Box>
  )
}

/**
 * Render a single diagnostic line.
 *
 * @private
 */
function DiagnosticRow({ diagnostic }: { readonly diagnostic: StoryDiagnostic }): ReactElement {
  const icon = match(diagnostic.severity)
    .with('error', () => '✖')
    .with('warning', () => '⚠')
    .exhaustive()

  const color = match(diagnostic.severity)
    .with('error', () => 'red' as const)
    .with('warning', () => 'yellow' as const)
    .exhaustive()

  return (
    <Box gap={1}>
      <Text color={color}>{icon}</Text>
      <Text bold>{diagnostic.storyName}</Text>
      <Text dimColor>—</Text>
      <Text>{diagnostic.message}</Text>
    </Box>
  )
}

/**
 * Build include patterns from the optional CLI flag.
 *
 * @private
 * @param include - Optional single glob pattern from CLI.
 * @returns Array of include patterns, or undefined for defaults.
 */
function buildIncludePatterns(include: string | undefined): readonly string[] | undefined {
  if (include === undefined) {
    return undefined
  }
  return [include]
}
