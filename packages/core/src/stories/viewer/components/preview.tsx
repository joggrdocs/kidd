import type { DOMElement } from 'ink'
import { Box, Text } from 'ink'
import type { ComponentType, ReactElement } from 'react'
import { useMemo, useRef } from 'react'
import { match } from 'ts-pattern'

import { ScrollArea } from '../../../ui/scroll-area.js'
import { useSize } from '../../../ui/use-size.js'
import type { Decorator, FieldDescriptor, Story } from '../../types.js'
import type { FieldError } from '../../validate.js'
import { EmptyState } from './empty-state.js'
import { ErrorBoundary } from './error-boundary.js'
import { PropsEditor } from './props-editor.js'

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
  readonly fields: readonly FieldDescriptor[]
  readonly errors: readonly FieldError[]
  readonly onPropsChange: (name: string, value: unknown) => void
  readonly isFocused: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Preview panel that renders the selected story component with the current
 * props and an inline props editor. Shows the qualified story name, file path,
 * and description above the rendered component. The props editor is inset
 * below the component with a dotted separator. Applies decorators in order
 * and wraps the result in an {@link ErrorBoundary} to catch render errors.
 * The component area is scrollable when content exceeds the viewport.
 *
 * @param props - The preview props.
 * @returns A rendered preview element.
 */
export function Preview({
  story,
  currentProps,
  context,
  fields,
  errors,
  onPropsChange,
  isFocused,
}: PreviewProps): ReactElement {
  const contentRef = useRef<DOMElement>(null)
  const { height: contentHeight } = useSize(contentRef)

  const DecoratedComponent = useMemo(() => {
    if (story === null) {
      return null
    }
    return applyDecorators(
      story.component as ComponentType<Record<string, unknown>>,
      story.decorators
    )
  }, [story])

  if (story === null || context === null || DecoratedComponent === null) {
    return (
      <Box borderStyle="single" borderDimColor flexDirection="column" flexGrow={1}>
        <Box paddingX={1}>
          <Text bold dimColor>
            Preview
          </Text>
        </Box>
        <EmptyState />
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="single"
      borderDimColor={!isFocused}
      borderColor={match(isFocused)
        .with(true, () => 'cyan' as const)
        .with(false, () => undefined)
        .exhaustive()}
      paddingX={1}
    >
      <PreviewHeader context={context} />
      <Box ref={contentRef} flexDirection="column" flexGrow={1}>
        <ScrollArea height={Math.max(1, contentHeight)}>
          <ErrorBoundary key={context.displayName}>
            <DecoratedComponent {...currentProps} />
          </ErrorBoundary>
        </ScrollArea>
      </Box>
      <PropsEditor
        fields={fields}
        values={currentProps}
        errors={errors}
        onChange={onPropsChange}
        isFocused={isFocused}
      />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the preview header showing story name, file path, and description.
 * "Preview" is displayed as a bold section label, then the story name,
 * path, and optional description below.
 *
 * @private
 * @param props - The header props.
 * @returns A rendered header element.
 */
function PreviewHeader({ context }: { readonly context: PreviewContext }): ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold>Preview</Text>
      </Box>
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
    <Text dimColor italic>
      {description}
    </Text>
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
