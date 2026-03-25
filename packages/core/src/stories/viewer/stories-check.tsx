import process from 'node:process'

import { useApp } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { match } from 'ts-pattern'

import { Output, useOutputStore } from '../../ui/output/index.js'
import { useScreenContext } from '../../ui/provider.js'
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

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Non-interactive component that discovers stories, validates them,
 * and prints diagnostics using `ctx.spinner`, `ctx.log`, and `ctx.report`
 * rendered through `<Output />` before exiting.
 *
 * @param props - The check props.
 * @returns A rendered check element.
 */
export function StoriesCheck({ include }: StoriesCheckProps): ReactElement {
  const ctx = useScreenContext()
  const store = useOutputStore()
  const { exit } = useApp()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      return
    }
    started.current = true

    const importer = createStoryImporter()
    const cwd = process.cwd()
    const includePatterns = buildIncludePatterns(include)

    ctx.spinner.start('Discovering stories...')

    const run = async (): Promise<void> => {
      const result = await discoverStories({
        cwd,
        importer,
        include: includePatterns,
      })

      if (result.entries.size === 0) {
        ctx.spinner.stop('Discovery complete')
        ctx.log.warn('No stories found.')
        exit()
        return
      }

      ctx.spinner.stop(
        `Discovered ${String(result.entries.size)} story file${match(result.entries.size !== 1)
          .with(true, () => 's')
          .with(false, () => '')
          .exhaustive()}`
      )

      const checkResult = checkStories(result.entries)

      checkResult.diagnostics.map((d) =>
        ctx.report.check({
          status: match(d.severity)
            .with('error', () => 'fail' as const)
            .with('warning', () => 'warn' as const)
            .exhaustive(),
          name: d.storyName,
          detail: d.message,
        })
      )

      const errors = checkResult.diagnostics.filter((d) => d.severity === 'error')
      const warnings = checkResult.diagnostics.filter((d) => d.severity === 'warning')

      ctx.report.summary({
        style: 'tally',
        stats: [
          { label: 'Stories', value: String(checkResult.storyCount) },
          { label: 'Errors', value: String(errors.length) },
          { label: 'Warnings', value: String(warnings.length) },
        ],
      })

      match(checkResult.passed)
        .with(true, () => {
          ctx.log.success('All stories passed validation')
        })
        .with(false, () => {
          ctx.log.error('Story validation failed')
        })
        .exhaustive()

      exit()
    }

    run().catch((error: unknown) => {
      ctx.spinner.stop('Discovery failed')
      const message = match(error instanceof Error)
        .with(true, () => (error as Error).message)
        .with(false, () => 'Unknown error during discovery')
        .exhaustive()
      ctx.log.error(message)
      exit()
    })
  }, [include, ctx, exit])

  return <Output store={store} />
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

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
