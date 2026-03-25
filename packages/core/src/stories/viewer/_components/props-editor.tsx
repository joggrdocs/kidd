import { Box, Text, useInput } from 'ink'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'

import type { FieldDescriptor } from '../../types.js'
import type { FieldError } from '../../validate.js'
import { FieldControl } from './field-control.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the {@link PropsEditor} component.
 */
interface PropsEditorProps {
  readonly fields: readonly FieldDescriptor[]
  readonly values: Record<string, unknown>
  readonly errors: readonly FieldError[]
  readonly onChange: (name: string, value: unknown) => void
  readonly isFocused: boolean
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Form editor for story props. Renders one {@link FieldControl} per schema
 * field with labels, validation errors, and keyboard navigation between
 * fields.
 *
 * @param props - The props editor props.
 * @returns A rendered props editor element.
 */
export function PropsEditor({
  fields,
  values,
  errors,
  onChange,
  isFocused,
}: PropsEditorProps): ReactElement {
  const [focusedFieldIndex, setFocusedFieldIndex] = useState(0)

  useEffect(() => {
    setFocusedFieldIndex((current) => {
      if (fields.length === 0) {
        return 0
      }
      if (current >= fields.length) {
        return fields.length - 1
      }
      return current
    })
  }, [fields.length])

  useInput(
    (_input, key) => {
      if (key.upArrow) {
        setFocusedFieldIndex((current) => {
          if (current > 0) {
            return current - 1
          }
          return current
        })
      }
      if (key.downArrow) {
        setFocusedFieldIndex((current) => {
          if (current < fields.length - 1) {
            return current + 1
          }
          return current
        })
      }
    },
    { isActive: isFocused }
  )

  if (fields.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No editable props</Text>
      </Box>
    )
  }

  return (
    <Box
      flexDirection="column"
      borderStyle={match(isFocused)
        .with(true, () => 'bold' as const)
        .with(false, () => 'single' as const)
        .exhaustive()}
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text
          bold
          color={match(isFocused)
            .with(true, () => 'cyan' as const)
            .with(false, () => undefined)
            .exhaustive()}
        >
          Props
        </Text>
      </Box>
      {fields.map((field, index) => {
        const fieldError = findFieldError(errors, field.name)
        const isFieldFocused = isFocused && index === focusedFieldIndex

        return (
          <Box key={field.name} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              <Box width={16}>
                <Text
                  color={match(isFieldFocused)
                    .with(true, () => 'cyan' as const)
                    .with(false, () => undefined)
                    .exhaustive()}
                  bold={isFieldFocused}
                >
                  {field.name}
                  {requiredMarker(field.isOptional)}
                </Text>
              </Box>
              <FieldControl
                control={field.control}
                value={values[field.name]}
                options={field.options as readonly string[] | undefined}
                onChange={(value: unknown) => onChange(field.name, value)}
                isFocused={isFieldFocused}
              />
            </Box>
            <FieldErrorMessage error={fieldError} />
          </Box>
        )
      })}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Return the required marker suffix for a field label.
 *
 * @private
 * @param isOptional - Whether the field is optional.
 * @returns An empty string for optional fields, '*' for required fields.
 */
function requiredMarker(isOptional: boolean): string {
  if (isOptional) {
    return ''
  }
  return '*'
}

/**
 * Render a field error message, or nothing when no error exists.
 *
 * @private
 * @param props - The component props.
 * @returns A rendered error message or null.
 */
function FieldErrorMessage({ error }: { readonly error: FieldError | null }): ReactElement | null {
  if (error === null) {
    return null
  }
  return (
    <Box paddingLeft={16}>
      <Text color="red">{error.message}</Text>
    </Box>
  )
}

/**
 * Find the first error matching a given field name.
 *
 * @private
 * @param errors - The array of field errors.
 * @param fieldName - The field name to search for.
 * @returns The matching error, or null if none found.
 */
function findFieldError(errors: readonly FieldError[], fieldName: string): FieldError | null {
  const found = errors.find((error) => error.field === fieldName)
  if (found === undefined) {
    return null
  }
  return found
}
