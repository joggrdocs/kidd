import { Box, Text } from 'ink'
import type { ComponentType, ReactElement } from 'react'

import type { Decorator, Story } from '../../types.js'
import { EmptyState } from './empty-state.js'
import { ErrorBoundary } from './error-boundary.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Preview} component.
 */
interface PreviewProps {
  readonly story: Story | null
  readonly currentProps: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Preview panel that renders the selected story component with the current
 * props. Applies decorators in order and wraps the result in an
 * {@link ErrorBoundary} to catch render errors.
 *
 * @param props - The preview props.
 * @returns A rendered preview element.
 */
export function Preview({ story, currentProps }: PreviewProps): ReactElement {
  if (story === null) {
    return <EmptyState />
  }

  const DecoratedComponent = applyDecorators(
    story.component as ComponentType<Record<string, unknown>>,
    story.decorators
  )

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      <Box marginBottom={1}>
        <Text bold>{story.name}</Text>
        <StoryDescription description={story.description} />
      </Box>
      <ErrorBoundary>
        <DecoratedComponent {...currentProps} />
      </ErrorBoundary>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

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
  if (description === null || description === undefined) {
    return null
  }
  return <Text dimColor> - {description}</Text>
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
