import { Box, Text } from 'ink'
import type { ComponentType, ReactElement } from 'react'
import { useMemo } from 'react'

import type { Decorator, Story } from '../../types.js'
import { EmptyState } from './empty-state.js'
import { ErrorBoundary } from './error-boundary.js'

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
 * props. Shows the file path, qualified story name, and description above
 * the rendered component. Applies decorators in order and wraps the result
 * in an {@link ErrorBoundary} to catch render errors.
 *
 * @param props - The preview props.
 * @returns A rendered preview element.
 */
export function Preview({ story, currentProps, context }: PreviewProps): ReactElement {
  if (story === null || context === null) {
    return <EmptyState />
  }

  const DecoratedComponent = useMemo(
    () =>
      applyDecorators(story.component as ComponentType<Record<string, unknown>>, story.decorators),
    [story.component, story.decorators]
  )

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      <PreviewHeader context={context} />
      <ErrorBoundary key={context.displayName}>
        <DecoratedComponent {...currentProps} />
      </ErrorBoundary>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the preview header showing file path, story name, and description.
 *
 * @private
 * @param props - The header props.
 * @returns A rendered header element.
 */
function PreviewHeader({ context }: { readonly context: PreviewContext }): ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text dimColor>{context.filePath}</Text>
      <Box gap={1}>
        <Text bold>{context.displayName}</Text>
      </Box>
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
  return <Text dimColor>{description}</Text>
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
