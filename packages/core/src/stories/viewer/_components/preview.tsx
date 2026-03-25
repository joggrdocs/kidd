import { Box, Text } from 'ink'
import type { ComponentType, ReactElement } from 'react'
import { useMemo } from 'react'

import { useFullScreen } from '../../../ui/fullscreen.js'
import { ScrollArea } from '../../../ui/scroll-area.js'
import type { Decorator, Story } from '../../types.js'
import { EmptyState } from './empty-state.js'
import { ErrorBoundary } from './error-boundary.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Number of terminal rows consumed by preview chrome (border, header,
 * padding, status bar) that must be subtracted from terminal height
 * to compute the scrollable content area height.
 *
 * @private
 */
const PREVIEW_CHROME_ROWS = 10

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Contextual metadata for the preview header display.
 */
export interface PreviewContext {
  readonly filePath: string
  readonly displayName: string
  readonly description: string | undefined
}

/**
 * Props for the {@link Preview} component.
 */
interface PreviewProps {
  readonly story: Story | null
  readonly currentProps: Record<string, unknown>
  readonly context: PreviewContext | null
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Preview panel that renders the selected story component with the current
 * props. Shows the qualified story name, file path, and description above
 * the rendered component inside a bordered box. Applies decorators in order
 * and wraps the result in an {@link ErrorBoundary} to catch render errors.
 * The component area is scrollable when content exceeds the viewport.
 *
 * @param props - The preview props.
 * @returns A rendered preview element.
 */
export function Preview({ story, currentProps, context }: PreviewProps): ReactElement {
  const { rows } = useFullScreen()
  const scrollHeight = Math.max(1, rows - PREVIEW_CHROME_ROWS)

  if (story === null || context === null) {
    return (
      <Box borderStyle="single" flexDirection="column" flexGrow={1}>
        <EmptyState />
      </Box>
    )
  }

  const DecoratedComponent = useMemo(
    () =>
      applyDecorators(story.component as ComponentType<Record<string, unknown>>, story.decorators),
    [story.component, story.decorators]
  )

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" paddingX={1}>
      <PreviewHeader context={context} />
      <ScrollArea height={scrollHeight}>
        <ErrorBoundary key={context.displayName}>
          <DecoratedComponent {...currentProps} />
        </ErrorBoundary>
      </ScrollArea>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the preview header showing story name, file path, and description.
 * Name is displayed first and bold, path is styled as code (italic + dim),
 * and description is visually separated below.
 *
 * @private
 * @param props - The header props.
 * @returns A rendered header element.
 */
function PreviewHeader({ context }: { readonly context: PreviewContext }): ReactElement {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text bold>{context.displayName}</Text>
      <Text italic dimColor>
        {context.filePath}
      </Text>
      <StoryDescription description={context.description} />
    </Box>
  )
}

/**
 * Render a story description when available, or nothing when absent.
 *
 * @private
 * @param props - The component props.
 * @returns A rendered description element or null.
 */
function StoryDescription({
  description,
}: {
  readonly description: string | undefined
}): ReactElement | null {
  if (description === undefined) {
    return null
  }
  return (
    <Box marginTop={1}>
      <Text dimColor italic>
        {description}
      </Text>
    </Box>
  )
}

/**
 * Apply a list of decorators to a component by reducing from left to right.
 * Each decorator wraps the previous result.
 *
 * @private
 * @param component - The base story component.
 * @param decorators - The decorators to apply.
 * @returns The fully decorated component.
 */
function applyDecorators(
  component: ComponentType<Record<string, unknown>>,
  decorators: readonly Decorator[]
): ComponentType<Record<string, unknown>> {
  return decorators.reduce<ComponentType<Record<string, unknown>>>(
    (Comp, decorator) => decorator(Comp),
    component
  )
}
